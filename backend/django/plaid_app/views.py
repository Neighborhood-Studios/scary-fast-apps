import hashlib
import hmac
import logging
import time
from decimal import Decimal

import jwt
import plaid
from django.apps import apps
from django.conf import settings
from django.db import transaction
from django.http import HttpResponseNotFound, JsonResponse, HttpRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.item_remove_response import ItemRemoveResponse
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.link_token_create_response import LinkTokenCreateResponse
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.webhook_verification_key_get_request import WebhookVerificationKeyGetRequest
from rest_framework import serializers
from rest_framework.decorators import api_view

from core_utils.view_utils import get_token_auth_header
from plaid_app import tasks
from plaid_app.models import PlaidLink
from plaid_app.utils import authorize_and_create_investment, format_error_api_error, get_client_ip, \
    get_client_user_agent


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
        client = apps.get_app_config('django_app').plaid_client
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

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    if not link_data.permanent_token:
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
        client = apps.get_app_config('django_app').plaid_client
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

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    # investordata = link_data.user.investordata

    serializer = ExchangeLinkSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    public_token = serializer.validated_data['public_token']
    plaid_request = ItemPublicTokenExchangeRequest(
        public_token=public_token
    )

    try:
        client = apps.get_app_config('django_app').plaid_client
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
        # investordata.plaid_connected = True
        # investordata.save()

    return JsonResponse({'public_token_exchange': 'complete'})


@api_view(['GET'])
def get_balance(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    if not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        plaid_request = AccountsBalanceGetRequest(
            access_token=link_data.permanent_token
        )
        client = apps.get_app_config('django_app').plaid_client
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

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    if not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        plaid_request = AccountsGetRequest(
            access_token=link_data.permanent_token
        )
        client = apps.get_app_config('django_app').plaid_client
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

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)
    if not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)

    try:
        request = ItemGetRequest(access_token=link_data.permanent_token)
        client = apps.get_app_config('django_app').plaid_client
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


@api_view(['POST'])
def remove_item(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    link_data = PlaidLink.objects.get(user_id=initiator_user_id)

    if not link_data.permanent_token:
        return JsonResponse({'status': 'not connected'}, status=400)
    # investor_data = link_data.user.investordata
    try:
        plaid_request = ItemRemoveRequest(
            access_token=link_data.permanent_token
        )
        client = apps.get_app_config('django_app').plaid_client
        response: ItemRemoveResponse = client.item_remove(plaid_request)
        link_data.permanent_token = None
        # if investor_data is not None:
        #     investor_data.plaid_connected = False
        #     investor_data.save()

        link_data.save()
        return JsonResponse(response.to_dict())
    except plaid.ApiException as e:
        error_response = format_error_api_error(e)
        return JsonResponse(error_response, status=400)


def test_transfer(request: HttpRequest):
    # logging.info('headers "%s"', '",\n"'.join('%s ::: %s' % (k, v) for k, v in request.headers.items()))

    link = list(PlaidLink.objects.filter(permanent_token__isnull=False))[0]

    transfer, auth, error = authorize_and_create_investment(
        user=link.user,
        amount=Decimal('1.00'),
        user_present=True,
        beacon_session_id=None,
        device_ip=get_client_ip(request),
        device_ua=get_client_user_agent(request),
    )
    if not error:
        return JsonResponse(transfer.to_dict(), status=200)
    return JsonResponse(error, status=400)


def _validate_webhook_request(request):
    # verify that request is from plaid
    jwt_token = request.headers.get('plaid-verification')
    if jwt_token is None:
        return False
    jwt_token = jwt_token.partition(" ")[2]
    header = jwt.get_unverified_header(jwt_token)
    if header['alg'] != 'ES256':  # hardcode per docs
        return False

    # get public key based on key id
    plaid_request = WebhookVerificationKeyGetRequest(key_id=header['kid'])
    client = apps.get_app_config('django_app').plaid_client
    response = client.webhook_verification_key_get(plaid_request)
    public_key = response['key']

    # TODO: cache public keys

    if public_key['expired_at'] is not None:
        # attempt to use expired key
        return False
    try:
        payload = jwt.decode(jwt_token, public_key, algorithms=['ES256'])
    except jwt.PyJWTError:
        return False
    # Ensure that the token is not expired
    if payload["iat"] < time.time() - 5 * 60:
        return False

    request_body_sha256 = payload['request_body_sha256']
    m = hashlib.sha256()
    m.update(request.body)
    body_hash = m.hexdigest()
    if not hmac.compare_digest(body_hash, request_body_sha256):
        return False
    return True


def handle_transfer_hooks(hook_code, body):
    if hook_code == 'TRANSFER_EVENTS_UPDATE':
        logging.info('Plaid: initiated transfer events sync')
        tasks.sync_transfers.send()


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

    body = request.json()
    hook_type = body['webhook_type']
    hook_code = body['webhook_code']
    if hook_type == 'TRANSFER':
        handle_transfer_hooks(hook_code, body)

    return JsonResponse({}, status=200)
