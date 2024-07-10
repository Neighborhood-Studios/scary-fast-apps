import hashlib
import hmac
import logging

import jwt
import redis.lock
import requests
from django.apps import apps
from django.conf import settings
from django.http import HttpResponseNotFound, JsonResponse, HttpResponse, StreamingHttpResponse
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes

from core_utils.permissions import IsStaff
from core_utils.utils import make_redis_key
from core_utils.view_utils import get_token_auth_header
from signwell.tasks import update_completed_pdf_url_delayed
from users.models.user import User


class GetSignWellDocumentSerializer(serializers.Serializer):
    signwell_document_id = serializers.CharField(required=True)
    recipient_user_id = serializers.CharField(required=False, default=None)
    send_email_to_user = serializers.BooleanField(required=False, default=False)


@api_view(['POST'])
def get_signwell_document(request):
    initiator_user_id = request.user.username
    serializer = GetSignWellDocumentSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    signwell_template_id = serializer.validated_data['signwell_document_id']
    recipient_user_id = serializer.validated_data['recipient_user_id']
    send_email_to_user = serializer.validated_data['send_email_to_user']

    user_id = recipient_user_id or initiator_user_id
    user = User.objects.get(auth0id=user_id)

    doc_template = SignWellDocument.objects.filter(template_id=signwell_template_id).first()
    if not doc_template:
        return HttpResponseNotFound()

    logging.info('SignWell: new request for user %s, template %s', user, doc_template)
    previous_document = SignWellSignedDocument.objects.filter(
        user=user, template_id=signwell_template_id
    ).first()
    if previous_document:
        logging.info('SignWell: found previous document %s', previous_document)

        if previous_document.signed:
            logging.info('SignWell: previous document already signed')
            return JsonResponse({'status': 'already signed'}, status=400)

    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(redis=redis_client, name=make_redis_key('user_signwell_%s' % user.auth0id),
                           timeout=600, blocking_timeout=600)
    with lock:
        wellload = {
            "test_mode": not settings.IS_PROD,
            "draft": False,
            "with_signature_page": False,
            "reminders": False,
            "apply_signing_order": False,
            "embedded_signing": True,
            "embedded_signing_notifications": True,
            "text_tags": False,
            "allow_decline": False,
            "allow_reassign": False,
            "template_id": doc_template.template_id,
            "name": f'{doc_template.title}',
            "api_application_id": settings.SIGNWELL_API_APP_ID,
            "recipients": [
                {
                    "id": str(user.auth0id),
                    "placeholder_name": "user",
                    "email": user.email,
                    "name": (user.first_name or '') + " " + (user.last_name or ''),
                    "send_email": send_email_to_user,
                    "send_email_delay": 0,
                }
            ]
        }
        logging.info('SignWell: sending request %s', wellload)
        url = "https://www.signwell.com/api/v1/document_templates/documents/"
        headers = {
            "X-Api-Key": settings.SIGNWELL_API_KEY,
            "accept": "application/json",
            "content-type": "application/json"
        }
        response = None
        try:
            response = requests.post(url, json=wellload, headers=headers)
            response.raise_for_status()
        except Exception as e:
            logging.error('SignWell: error %s, response: %s', e, response.text)
            return JsonResponse({'status': 'error creating document'}, status=500)
        data = response.json()
        document_id = data['id']
        embedded_signing_url = data['recipients'][0]['embedded_signing_url']
        doc_status = data['recipients'][0]['status']

        if previous_document:
            previous_document.document_id = document_id
            previous_document.signed = False
            previous_document.status = doc_status
            previous_document.completed_pdf_url = None
            previous_document.embedded_preview_url = data['embedded_preview_url']
            previous_document.embedded_signing_url = embedded_signing_url
            previous_document.save()
        else:
            document = SignWellSignedDocument(
                user=user,
                template_id=signwell_template_id,
                document_id=document_id,
                status=doc_status,
                embedded_signing_url=embedded_signing_url,

                signed=False,
            )
            document.save()
        return JsonResponse({'status': 'ok', 'document_id': document_id, 'embedded_signing_url': embedded_signing_url})


class SendDocumentReminderToUserSerializer(serializers.Serializer):
    user_id = serializers.CharField(required=True, max_length=100)
    document_id = serializers.CharField(required=True, max_length=100)


# https://developers.signwell.com/reference/post_api-v1-documents-id-remind
@api_view(['POST'])
@permission_classes([IsStaff])
def send_document_reminder_to_user(request):
    serializer = SendDocumentReminderToUserSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    user_id = serializer.validated_data["user_id"]
    document_id = serializer.validated_data["document_id"]

    signwell_document = SignWellSignedDocument.objects.filter(
        user_id=user_id, document_id=document_id
    ).first()

    if not signwell_document:
        return HttpResponseNotFound()

    logging.info('SignWell: sending reminder')
    url = f'https://www.signwell.com/api/v1/documents/{signwell_document.document_id}/remind'
    headers = {
        "X-Api-Key": settings.SIGNWELL_API_KEY,
        "accept": "application/json",
        "content-type": "application/json"
    }
    response = None
    try:
        response = requests.post(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        logging.error('SignWell: sending reminder error %s, response: %s', e, response.text)
        return JsonResponse({'status': 'error sending reminder'}, status=response.status_code)
    data = response.json()
    return JsonResponse({'status': 'ok', 'response': data})


class GetSignWellCompletedDocumentSerializer(serializers.Serializer):
    document_id = serializers.CharField(required=True)
    url_only = serializers.BooleanField()


# https://developers.signwell.com/reference/get_api-v1-documents-id-completed-pdf-1
@api_view(['POST'])
def get_signwell_completed_document(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')
    user = User.objects.get(auth0id=initiator_user_id)

    serializer = GetSignWellCompletedDocumentSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    document_id = serializer.validated_data['document_id']
    url_only = serializer.validated_data['url_only']

    # check if document belongs to user
    document = SignWellSignedDocument.objects.filter(
        user=user, document_id=document_id
    ).first()
    if not document:
        return JsonResponse("Not Found", status=404)

    url = f"https://www.signwell.com/api/v1/documents/{document_id}/completed_pdf/"
    params = {'url_only': url_only} if url_only else None
    headers = {
        "X-Api-Key": settings.SIGNWELL_API_KEY,
        "content-type": "application/json"
    }

    response = None
    try:
        response = requests.get(url, params=params, headers=headers, stream=not url_only)
        response.raise_for_status()
    except Exception as e:
        logging.error('SignWell: get_signwell_completed_document error %s, response: %s', e, response.text)
        return JsonResponse({'status': 'error getting completed document'}, status=response.status_code)

    if url_only:
        data = response.json()
        return JsonResponse({'status': 'ok', 'file_url': data['file_url']})
    else:
        return StreamingHttpResponse(
            response.raw,
            content_type=response.headers.get('content-type'),
            status=response.status_code,
            reason=response.reason
        )


class GetSignWellWebHookSerializer(serializers.Serializer):
    event = serializers.JSONField(required=True)
    data = serializers.JSONField(required=True)

    def validate(self, data):
        # validate webhook event
        key = settings.SIGNWELL_WEBHOOK_KEY
        event = data.get('event')
        expected_signature = event.get('hash', '')

        check_str = f"{event.get('type')}@{event.get('time')}"
        calculated_signature = hmac.new(key.encode('utf-8'), check_str.encode('utf-8'), hashlib.sha256).hexdigest()
        event_is_valid = hmac.compare_digest(expected_signature,
                                             calculated_signature)  # Will be True if signatures match
        if not event_is_valid:
            raise serializers.ValidationError("invalid event signature")

        return data


# SignWell WebHooks Endpoint
# full events list https://developers.signwell.com/reference/events
@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def webhook_events_endpoint(request):
    serializer = GetSignWellWebHookSerializer(data=request.data)

    if not serializer.is_valid():
        logging.warning('SignWell WebHook event error: %s', serializer.errors)
        return HttpResponse(status=400)

    event = serializer.validated_data['event']
    event_data = serializer.validated_data['data']
    event_type = event['type']
    # signer related to the event only applies to following events: document_viewed, document_declined, document_signed
    related_signer = event.get('related_signer', {})

    logging.info('SignWell WebHook: got event %s: %s %s', event_type, event_data, event)

    if event_type.startswith('document'):
        document_event_handler(event_type, event_data['object'], related_signer.get('email'))

    return HttpResponse(status=200)


def document_event_handler(event, data, related_signer_email):
    document_id = data['id']
    related_recipient = related_signer_email and [r for r in data.get('recipients', []) if r['email'] == related_signer_email][0]
    related_user = related_recipient and User.objects.get(auth0id=related_recipient['id'])

    if related_user:
        logging.info('SignWell WebHook: %s by %s: "%s"', event,
                     related_recipient['name'], data['name'])
        signwell_user_document = SignWellSignedDocument.objects.filter(
            user=related_user, document_id=document_id
        ).first()
        if signwell_user_document:
            signwell_user_document.status = related_recipient['status']
            signwell_user_document.signed = event == 'document_signed' or signwell_user_document.signed
            signwell_user_document.save()

    else:
        logging.info('SignWell WebHook: %s: "%s"', event, data['name'])
        for recipient in data['recipients']:
            signwell_user_document = SignWellSignedDocument.objects.filter(
                user_id=recipient['id'], document_id=document_id
            ).first()
            if signwell_user_document:
                signwell_user_document.status = recipient['status']
                signwell_user_document.embedded_signing_url = recipient['embedded_signing_url']
                signwell_user_document.embedded_preview_url = data['embedded_preview_url']
                signwell_user_document.save()

    if event == 'document_completed':
        # wait 3 seconds and get its pdf url, then update DB record
        # (https://developers.signwell.com/reference/retrieving-the-completed-document-pdf)
        update_completed_pdf_url_delayed.send_with_options(args=(data['id'], 0), delay=1000 * 2)
