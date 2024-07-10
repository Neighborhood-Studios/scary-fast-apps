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
from plaid.model.country_code import CountryCode
from plaid.model.institution import Institution
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_get_response import TransactionsGetResponse
from plaid.model.transfer import Transfer
from plaid.model.transfer_authorization import TransferAuthorization
from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
from plaid.model.transfer_authorization_device import TransferAuthorizationDevice
from plaid.model.transfer_authorization_user_in_request import TransferAuthorizationUserInRequest
from plaid.model.transfer_create_request import TransferCreateRequest
from plaid.model.transfer_network import TransferNetwork
from plaid.model.transfer_type import TransferType

from core_utils.utils import make_redis_key, _make_redis_lock
from users.models.user import User

if TYPE_CHECKING:
    from plaid_app.models import PlaidTransfer

TRANSFER_DIRECTION_INCOMING = 'incoming'
TRANSFER_DIRECTION_OUTGOING = 'outgoing'


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
        user: User, amount: Decimal, user_present: bool, device_ip, device_ua,
        direction=TRANSFER_DIRECTION_INCOMING
) -> tuple[PlaidTransfer | None, TransferAuthorization | None, Any]:
    try:
        # TODO: We call /accounts/get to obtain first account_id - in production,
        # account_id's should be persisted in a data store and retrieved
        # from there.
        if direction == TRANSFER_DIRECTION_INCOMING:
            transfer_type = TransferType('debit')
            ach_class = ACHClass('web')
        elif direction == TRANSFER_DIRECTION_OUTGOING:
            transfer_type = TransferType('credit')
            ach_class = ACHClass('ppd')
        else:
            raise AssertionError('invalid direction %s' % direction)
        access_token = user.plaidlink.permanent_token
        request = AccountsGetRequest(access_token=access_token)
        client = apps.get_app_config('plaid_app').plaid_client
        response = client.accounts_get(request)
        logging.info('Plaid: accounts_get response: %s', response.to_dict())

        account_id = response['accounts'][0]['account_id']
        # investor_data = user.investordata
        investor_data = user

        optionals = {}
        if device_ip:
            optionals['device'] = TransferAuthorizationDevice(
                ip_address=device_ip,
                user_agent=device_ua,
            )

        request = TransferAuthorizationCreateRequest(
            access_token=access_token,
            account_id=account_id,
            type=transfer_type,
            network=TransferNetwork('same-day-ach'),
            amount=str(amount),
            ach_class=ach_class,
            user_present=user_present,
            # beacon_session_id=beacon_session_id,  # removed?????
            user=TransferAuthorizationUserInRequest(
                legal_name='%s %s' % (investor_data.first_name, investor_data.last_name),
                phone_number=investor_data.phone_number if investor_data.phone_verified else '',
                # address?
            ),
            **optionals,
        )
        response = client.transfer_authorization_create(request)
        logging.info('Plaid: transfer authorization response: %s', response.to_dict())
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
        transfer_create_lock = redis.lock.Lock(redis=redis_client, name=get_transfer_create_lock_name(),
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
            logging.info('Plaid: transfer create response: %s', response.to_dict())
            return tracked_transfer, authorization, None
    except plaid.ApiException as e:
        logging.info('Plaid: transfer error response: %s', e.body)

        error_response = format_error_api_error(e)
        return None, None, error_response


def get_transfer_create_lock_name():
    return make_redis_key('lock:transfer_create')


def format_error_api_error(e):
    response = json.loads(e.body)
    return {
        'status': 'api error',
        'error': {'status_code': e.status,
                  'display_message': response['error_message'],
                  'error_code': response['error_code'],
                  'error_type': response['error_type']}
    }


def format_account_name(account, institution):
    bank_name = institution['name']
    mask = account['mask']
    routing_number = institution['routing_numbers'][0] if institution['routing_numbers'] else 'not provided'
    return f'{bank_name} (RN {routing_number}) account number ending with {mask}'


def make_user_transaction_lock(auth0id):
    return _make_redis_lock(f'user_transaction_lock_{auth0id}')


def _make_transactions_get_req(permanent_token, end_date, offset, start_date, logger=None) -> TransactionsGetResponse:
    logger = logger or logging.getLogger(__name__)
    request = TransactionsGetRequest(
        access_token=permanent_token,
        start_date=start_date,
        end_date=end_date,
        options=TransactionsGetRequestOptions(
            count=100,
            offset=offset,
            days_requested=180,
        )
    )
    client = apps.get_app_config('plaid_app').plaid_client
    response = client.transactions_get(request)
    logger.info('Plaid: accounts_get response.len(): %s', len(str(response.to_dict())))
    return response


PRODUCT_NOT_READY = object()


def _fetch_plaid_transactions(start_date, end_date, permanent_token, logger):
    logger = logger or logging.getLogger(__name__)

    more_data = True
    transactions_count = 0

    while more_data:
        # save all transactions and at the same time aggregate data
        try:
            response = _make_transactions_get_req(
                permanent_token=permanent_token,
                end_date=end_date,
                start_date=start_date,
                offset=transactions_count,
            )
            transactions = response['transactions']
            transactions_count += len(transactions)
            more_data = transactions_count < response['total_transactions']
            yield transactions

        except plaid.ApiException as e:
            log_f = logger.error
            login_required_error = False
            if e.body and 'ITEM_LOGIN_REQUIRED' in e.body:
                log_f = logger.error
                login_required_error = True
            elif e.body and 'PRODUCT_NOT_READY' in e.body:
                yield PRODUCT_NOT_READY
                return None
            log_f('_fetch_plaid_transactions: failed to make plaid call: %s', e, exc_info=True)

            if login_required_error:
                return None
            raise

    return None


def _get_institution_details(plaid_client, institution_id) -> Institution:
    request = InstitutionsGetByIdRequest(
        institution_id=institution_id,
        country_codes=[CountryCode('US')]
    )
    institution_response = plaid_client.institutions_get_by_id(request)
    return institution_response['institution']
