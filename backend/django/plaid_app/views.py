import datetime
import hashlib
import hmac
import json
import logging
import time

import jwt
import plaid
from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.http import HttpResponseNotFound, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from jwt import PyJWK
from plaid import ApiValueError
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.item_remove_response import ItemRemoveResponse
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.link_token_create_response import LinkTokenCreateResponse
from plaid.model.products import Products
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest
from rest_framework import serializers
from rest_framework.decorators import api_view

from core_utils.permissions import IsStaff
from core_utils.view_utils import get_token_auth_header
from plaid_app import tasks
from plaid_app.apps import AccountsBalanceGetRequestRight, AccountsBalanceGetRequestOptionsRight
from plaid_app.models import (
    PlaidLink,
    PLAID_ITEM_STATUS_NORMAL,
)
from plaid_app.utils import (
    format_error_api_error,
)
from users.models.user import User


class CreateLinkSerializer(serializers.Serializer):
    redirect_uri = serializers.URLField(max_length=100, required=False, allow_blank=True)


@api_view(['POST'])
def create_link_token(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    serializer = CreateLinkSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    # Get the client_user_id by searching for the current user
    link_data, _ = PlaidLink.objects.get_or_create(user_id=initiator_user_id)
    plaid_user_id = str(link_data.plaid_user_id)
    redirect_url = serializer.validated_data['redirect_uri'] or 'https://%s/plaid' % settings.APP_DOMAIN_NAME
    # Create a link_token for the given user
    plaid_request = LinkTokenCreateRequest(
        # most products can be initialized later on first use
        products=[Products("auth"), Products("transfer")],
        client_name=settings.PLAID_APP_NAME,
        country_codes=[CountryCode('US')],
        redirect_uri=redirect_url,
        language='en',
        webhook='https://%s/da/api/v1/plaid/wh' % settings.API_DOMAIN_NAME,
        user=LinkTokenCreateRequestUser(
            client_user_id=plaid_user_id
        )
    )
    try:
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.link_token_create(plaid_request)
        # Send the data to the client
        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


@api_view(['POST'])
def update_link_token(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    serializer = CreateLinkSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    try:
        link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    except PlaidLink.DoesNotExist:
        link_data = None
    if link_data is None or not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    plaid_user_id = str(link_data.plaid_user_id)

    redirect_url = serializer.validated_data['redirect_uri'] or 'https://%s/plaid' % settings.APP_DOMAIN_NAME

    plaid_request = LinkTokenCreateRequest(
        client_name=settings.PLAID_APP_NAME,
        country_codes=[CountryCode('US')],
        redirect_uri=redirect_url,
        language='en',
        webhook='https://%s/da/api/v1/plaid/wh' % settings.API_DOMAIN_NAME,
        access_token=link_data.permanent_token,
        user=LinkTokenCreateRequestUser(
            client_user_id=plaid_user_id
        )
    )
    try:
        client = apps.get_app_config('plaid_app').plaid_client
        response: LinkTokenCreateResponse = client.link_token_create(plaid_request)

        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


class ExchangeLinkSerializer(serializers.Serializer):
    public_token = serializers.CharField(max_length=200, required=True, allow_blank=False)


@api_view(['POST'])
def exchange_public_token(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    try:
        link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    except PlaidLink.DoesNotExist:
        return JsonResponse({'status': 'link not initialized'}, status=400)

    serializer = ExchangeLinkSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    public_token = serializer.validated_data['public_token']
    plaid_request = ItemPublicTokenExchangeRequest(
        public_token=public_token
    )

    try:
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.item_public_token_exchange(plaid_request)
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)

    access_token = response['access_token']
    item_id = response['item_id']

    with transaction.atomic():
        link_data.permanent_token = access_token
        link_data.item_id = item_id
        link_data.active = True
        link_data.save()

    return JsonResponse({'public_token_exchange': 'complete'})


@api_view(['GET'])
def get_balance(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    try:
        link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    except PlaidLink.DoesNotExist:
        link_data = None
    if link_data is None or not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    # not sure what it should be set to, 5 minutes seems ok
    # and it only applies to limited number of institutions according to docs
    min_last_updated_datetime = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        plaid_request = AccountsBalanceGetRequestRight(
            access_token=link_data.permanent_token,
            options=AccountsBalanceGetRequestOptionsRight(
                min_last_updated_datetime=min_last_updated_datetime
            )
        )
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.accounts_balance_get(plaid_request)
        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


@api_view(['GET'])
def get_accounts(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    try:
        link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    except PlaidLink.DoesNotExist:
        link_data = None
    if link_data is None or not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        plaid_request = AccountsGetRequest(
            access_token=link_data.permanent_token
        )
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.accounts_get(plaid_request)
        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


@api_view(['GET'])
def get_item(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')
    try:
        link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    except PlaidLink.DoesNotExist:
        link_data = None
    if link_data is None or not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        request = ItemGetRequest(access_token=link_data.permanent_token)
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.item_get(request)
        request = InstitutionsGetByIdRequest(
            institution_id=response['item']['institution_id'],
            country_codes=[CountryCode('US')]
        )
        institution_response = client.institutions_get_by_id(request)
        return JsonResponse({
            'error': None,
            'item': response.to_dict()['item'],
            'institution': institution_response.to_dict()['institution']
        })
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


class RemoveItemSerializer(serializers.Serializer):
    user_id = serializers.CharField(required=False, default=None)


@api_view(['POST'])
def remove_item(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    serializer = RemoveItemSerializer(data=request.data or {})
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    if IsStaff().has_permission(request, None):  # Manager can deactivate plaid directly
        target_user_id = serializer.validated_data.get('user_id', None)
        if not target_user_id:
            return JsonResponse({'status': 'user_id must be specified'}, status=400)
        target_user = User.objects.filter(auth0id=target_user_id).first()
    else:
        target_user = User.objects.filter(auth0id=request.user.username).first()
    if not target_user:
        return JsonResponse({"status": "user not found"}, status=404)

    link_data = PlaidLink.objects.get(user=target_user)

    if not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        plaid_request = ItemRemoveRequest(
            access_token=link_data.permanent_token
        )
        client = apps.get_app_config('plaid_app').plaid_client
        response: ItemRemoveResponse = client.item_remove(plaid_request)

        with transaction.atomic():

            link_data.permanent_token = None
            link_data.save()

        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


def _validate_webhook_request(request):
    # verify that request is from plaid
    signed_jwt = request.headers.get('plaid-verification')
    logging.info('_validate_webhook_request: headers "%s"',
                 '",\n"'.join('%s ::: %s' % (k, v) for k, v in request.headers.items()))

    if signed_jwt is None:
        return False

    header = jwt.get_unverified_header(signed_jwt)
    if header['alg'] != 'ES256':  # hardcode per docs
        logging.info('_validate_webhook_request: jwt header: %s', header)
        return False

    current_key_id = header['kid']

    # get public key based on key id
    try:
        plaid_request = WebhookVerificationKeyGetRequest(key_id=current_key_id)
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.webhook_verification_key_get(plaid_request)
    except ApiValueError as e:
        logging.warning('_validate_webhook_request: failed to get key %s from plaid: %s', current_key_id, e, exc_info=True)
        return False

    if response['key']['expired_at'] is not None:
        # attempt to use expired key
        return False

    public_key = PyJWK.from_dict(response['key'].to_dict()).key

    # TODO: cache public keys

    try:
        payload = jwt.decode(signed_jwt, public_key, algorithms=['ES256'])
    except jwt.PyJWTError as e:
        logging.warning('_validate_webhook_request: PyJWTError: %s', e, exc_info=True)
        return False
    # Ensure that the token is not expired
    logging.info('_validate_webhook_request: payload: %s', payload)
    if payload["iat"] < time.time() - 5 * 60:
        logging.info('_validate_webhook_request: iat expired')
        return False

    request_body_sha256 = payload['request_body_sha256']
    m = hashlib.sha256()
    m.update(request.body)
    body_hash = m.hexdigest()
    if not hmac.compare_digest(body_hash, request_body_sha256):
        logging.error('_validate_webhook_request: body_hash != request_body_sha256: %s != %s',
                      body_hash, request_body_sha256)
        return False
    return True


def handle_transfer_hooks(hook_code, body):
    if hook_code == 'TRANSFER_EVENTS_UPDATE':
        logging.info('Plaid: initiated transfer events sync')
        tasks.sync_transfers_plaid.send()


def handle_item_hooks(hook_code, body):
    item_id = body.get('item_id')
    if not item_id:
        return

    if hook_code == 'LOGIN_REPAIRED':
        item = PlaidLink.objects.filter(item_id=item_id, active=True).first()
        if item:
            PlaidLink.objects.filter(item_id=item_id, active=True).update(item_status=PLAID_ITEM_STATUS_NORMAL)
            return
        logging.warning('handle_item_hooks: no valid item with id %s', item_id)

    if hook_code == 'PENDING_EXPIRATION':
        item_id = body.get('item_id')
        item = PlaidLink.objects.filter(item_id=item_id, active=True).first()
        if item:
            # todo: handle, send email, etc
            return
    return


@csrf_exempt
def webhook(request):
    """
    {
      "webhook_type": "TRANSFER",
      "webhook_code": "TRANSFER_EVENTS_UPDATE",
      "environment": "production"
    }
    """
    if not _validate_webhook_request(request):
        return HttpResponseNotFound()
    # just log for now
    logging.info('plaid wh body: %s', request.body)

    # TODO: at least handle https://plaid.com/docs/api/items/#webhooks
    # TODO: push events into redis and process in dramtiq, webhook has timeout of 10 seconds or less
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'bad request'}, status=400)
    hook_type = data['webhook_type']
    hook_code = data['webhook_code']
    if hook_type == 'TRANSFER':
        handle_transfer_hooks(hook_code, data)
    elif hook_type == 'ITEM':
        handle_item_hooks(hook_code, data)
    return JsonResponse({}, status=200)

