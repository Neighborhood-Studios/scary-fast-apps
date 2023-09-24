from __future__ import annotations

import json
import logging
from decimal import Decimal
from typing import Any
from typing import TYPE_CHECKING

import plaid
import redis.lock
from django.apps import apps
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.ach_class import ACHClass
from plaid.model.transfer import Transfer
from plaid.model.transfer_authorization import TransferAuthorization
from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
from plaid.model.transfer_authorization_device import TransferAuthorizationDevice
from plaid.model.transfer_authorization_user_in_request import TransferAuthorizationUserInRequest
from plaid.model.transfer_create_request import TransferCreateRequest
from plaid.model.transfer_network import TransferNetwork
from plaid.model.transfer_type import TransferType

from users.models.user import User

if TYPE_CHECKING:
    from plaid_app.models import PlaidTransfer


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_client_user_agent(request):
    return request.META.get('HTTP_USER_AGENT') or 'UNKNOWN'


def authorize_and_create_investment(
        user: User, amount: Decimal, user_present: bool, beacon_session_id, device_ip, device_ua
) -> tuple[PlaidTransfer or None, TransferAuthorization or None, Any]:
    try:
        # TODO: We call /accounts/get to obtain first account_id - in production,
        # account_id's should be persisted in a data store and retrieved
        # from there.
        access_token = user.plaidlink.permanent_token
        request = AccountsGetRequest(access_token=access_token)
        client = apps.get_app_config('django_app').plaid_client
        response = client.accounts_get(request)
        logging.info('accounts_get response: %s', response.to_dict())

        account_id = response['accounts'][0]['account_id']

        request = TransferAuthorizationCreateRequest(
            access_token=access_token,
            account_id=account_id,
            type=TransferType('debit'),
            network=TransferNetwork('same-day-ach'),
            amount=str(amount),
            ach_class=ACHClass('web'),
            user_present=user_present,
            # beacon_session_id=beacon_session_id,  # removed?????
            device=TransferAuthorizationDevice(
                ip_address=device_ip,
                user_agent=device_ua,
            ),
            user=TransferAuthorizationUserInRequest(
                legal_name='%s %s' % (user.first_name, user.last_name),
                phone_number=user.phone_number if user.phone_verified else '',
                # address?
            ),
        )
        response = client.transfer_authorization_create(request)
        logging.info('transfer authorization response: %s', response.to_dict())
        authorization_id = response['authorization']['id']
        authorization: TransferAuthorization = response['authorization']
        if authorization.decision.value != 'approved':
            return None, authorization, {
                'status': 'transfer authorization error',
                'decision_rationale': authorization.decision_rationale.code.value,
            }

        request = TransferCreateRequest(
            access_token=access_token,
            account_id=account_id,
            authorization_id=authorization_id,
            description='Investment'
        )

        redis_client = apps.get_app_config('django_app').redis
        transfer_create_lock = redis.lock.Lock(redis=redis_client, name='lock:transfer_create',
                                               timeout=300, blocking_timeout=300)
        with transfer_create_lock:
            response = client.transfer_create(request)
            transfer: Transfer = response['transfer']
            from plaid_app.models import PlaidTransfer

            tracked_transfer = PlaidTransfer(
                id=transfer.id,
                transfer_body=transfer.to_dict(),
                authorization_body=authorization.to_dict(),
                transfer_status=transfer.status,
                amount=transfer.amount,
                transfer_type=transfer.type.value
            )
            tracked_transfer.save()
            logging.info('transfer create response: %s', response.to_dict())
            return tracked_transfer, authorization, None
    except plaid.ApiException as e:
        logging.info('transfer error response: %s', e.body)

        error_response = format_error_api_error(e)
        return None, None, error_response


def format_error_api_error(e):
    response = json.loads(e.body)
    return {
        'status': 'api error',
        'error': {'status_code': e.status,
                  'display_message': response['error_message'],
                  'error_code': response['error_code'],
                  'error_type': response['error_type']}
    }
