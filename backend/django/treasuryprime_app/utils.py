import datetime
import logging
from collections import namedtuple
from decimal import Decimal
from typing import Dict

import redis.lock
import requests
from django.apps import apps
from django.conf import settings
from requests.auth import HTTPBasicAuth
from requests.exceptions import HTTPError, JSONDecodeError

from core_utils.utils import make_redis_key
from treasuryprime_app.models import CounterpartyLink, ACHTransfer

logger = logging.getLogger(__name__)


TPACHTransfer = namedtuple(
    "TPACHTransfer",
    (
        "id",
        "account_id",
        "amount",
        "counterparty_id",
        "direction",
        "effective_date",
        "error",
        "sec_code",
        "service",
        "status",
        "created_at",
        "updated_at",
    )
)


def make_transfer_sync_lock():
    redis_client = apps.get_app_config('django_app').redis
    return redis.lock.Lock(
        redis=redis_client,
        name=make_redis_key('tp_ach_transfer_sync_lock'),
        timeout=600,
        blocking_timeout=600,
    )


def create_counterparty(
        account_name: str,
        ach_account_number: str,
        ach_account_type: str,
        ach_routing_number: str
) -> (CounterpartyLink | None, None | dict):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    payload = {
        "name_on_account": account_name,
        "ach": {
            "account_number": ach_account_number,
            "account_type": ach_account_type,
            "routing_number": ach_routing_number,
        }
    }

    url = settings.TREASURY_PRIME_API_ENDPOINT + "/counterparty"
    logger.info('TreasuryPrime: sending POST request to %s; payload: %s', url, payload)
    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            auth=HTTPBasicAuth(settings.TREASURY_PRIME_API_KEY_ID, settings.TREASURY_PRIME_API_SECRET_KEY),
        )
        response.raise_for_status()
    except HTTPError as e:
        logger.warning('TP create_counterparty error: %s', e.response.text)
        try:
            data = e.response.json()
        except JSONDecodeError:
            return None, {"status": "invalid server response", 'err_code': 500}

        if 400 <= e.response.status_code < 500:
            return None, {"status": data["error"], "err_code": e.response.status_code}

        logger.error('TreasuryPrime: error %s, response: %s', e, e.response.text)
        return None, {'status': 'error creating counterparty', 'err_code': e.response.status_code}
    except Exception as e:
        logger.error(e)
        return None, {'status': 'Internal server error', 'err_code': 500}

    data = response.json()
    logger.info('TP create_counterparty success: %s', data)

    return CounterpartyLink(
        id=data["id"],
        ach=data["ach"],
        name_on_account=data["name_on_account"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    ), None


def create_ach(
        account_id: str,
        amount: Decimal,
        counterparty_id: str,
        direction: str,
        sec_code: str,
) -> (ACHTransfer | None, None | str):
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    payload = {
        "account_id": account_id,
        "amount": str(amount),
        "counterparty_id": counterparty_id,
        "direction": direction,
        "sec_code": sec_code,
    }

    url = settings.TREASURY_PRIME_API_ENDPOINT + "/ach"

    try:
        logger.info(f'creating TP ACH by link: {url}; data: <{payload}>')
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            auth=HTTPBasicAuth(settings.TREASURY_PRIME_API_KEY_ID, settings.TREASURY_PRIME_API_SECRET_KEY),
        )
        response.raise_for_status()
    except HTTPError as e:
        logger.warning('TP ACH create error: %s', e.response.text)

        try:
            data = e.response.json()
        except JSONDecodeError:
            return None, {"status": "invalid server response", 'err_code': 500}

        if 400 <= e.response.status_code < 500:
            return None, {"status": data["error"], "err_code": e.response.status_code}

        logger.error('ACH: error %s, response: %s', e, e.response.text)
        return None, {'status': 'error creating ACH transfer', 'err_code': e.response.status_code}
    except Exception as e:
        logger.error('TP ACH create unhandled error: %s', e)
        return None, {'status': 'Internal server error', 'err_code': 500}

    data = response.json()
    logger.info('TP ACH create success: %s', data)

    return ACHTransfer(
        id=data["id"],
        account_id=data["account_id"],
        amount=data["amount"],
        counterparty_id=data["counterparty_id"],
        direction=data["direction"],
        effective_date=data["effective_date"],
        error=data["error"],
        sec_code=data["sec_code"],
        service=data["service"],
        status=data["status"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    ), None


def retrieve_achs(date_from, date_to: datetime) -> (Dict[str, TPACHTransfer] | None, None | dict):
    res = {}
    url = settings.TREASURY_PRIME_API_ENDPOINT + f"/ach"

    from_str = date_from.astimezone(datetime.UTC).strftime("%Y-%m-%d")
    to_str = (date_to.astimezone(datetime.UTC) + datetime.timedelta(1, 0)).strftime("%Y-%m-%d")
    params = {
        "from_date": from_str,
        "to_date": to_str,
    }
    auth = HTTPBasicAuth(settings.TREASURY_PRIME_API_KEY_ID, settings.TREASURY_PRIME_API_SECRET_KEY)

    while True:
        try:
            logger.info(f'retrieving TP ACH by link: {url}')
            response = requests.get(
                url,
                params=params,
                auth=auth,
            )
            response.raise_for_status()
        except HTTPError as e:
            logger.warning('TP ACH retrieve response: %s', e.response.text)

            try:
                data = e.response.json()
            except JSONDecodeError:
                return None, {"status": "invalid server response", 'err_code': 500}

            if 400 <= e.response.status_code < 500:
                return None, {"status": data["error"], "err_code": e.response.status_code}

            logger.error('retrieve ACH: error %s, response: %s', e, e.response.text)
            return None, {'status': 'error retrieving ACH', 'err_code': e.response.status_code}
        except Exception as e:
            logger.error(e)
            return None, {'status': 'Internal server error', 'err_code': 500}

        data = response.json()
        logger.info('TP ACH retrieve success: %s', data)

        for item in data["data"]:
            res[item["id"]] = TPACHTransfer(
                id=item["id"],
                account_id=item["account_id"],
                amount=item["amount"],
                counterparty_id=item["counterparty_id"],
                direction=item["direction"],
                effective_date=item["effective_date"],
                error=item["error"],
                sec_code=item["sec_code"],
                service=item["service"],
                status=item["status"],
                created_at=item["created_at"],
                updated_at=item["updated_at"],
            )

        params = None
        url = data.get("page_next", None)
        if not url:
            break

    return res, None


def retrieve_ach_by_url(url: str) -> (TPACHTransfer | None, None | dict):
    logger.info(f'retrieving TP ACH by link: {url}')
    try:
        response = requests.get(
            url,
            auth=HTTPBasicAuth(settings.TREASURY_PRIME_API_KEY_ID, settings.TREASURY_PRIME_API_SECRET_KEY),
        )
        response.raise_for_status()
    except HTTPError as e:
        try:
            data = e.response.json()
        except JSONDecodeError:
            return None, {"status": "invalid server response", 'err_code': 500}

        logger.debug('TP ACH retrieve response: %s', data)

        if 400 <= e.response.status_code < 500:
            return None, {"status": data["error"], "err_code": e.response.status_code}

        logger.error('retrieve ACH: error %s, response: %s', e, e.response.text)
        return None, {'status': 'error retrieving ACH', 'err_code': e.response.status_code}
    except Exception as e:
        logger.error(e)
        return None, {'status': 'Internal server error', 'err_code': 500}

    data = response.json()

    return TPACHTransfer(
        id=data["id"],
        account_id=data["account_id"],
        amount=data["amount"],
        counterparty_id=data["counterparty_id"],
        direction=data["direction"],
        effective_date=data["effective_date"],
        error=data["error"],
        sec_code=data["sec_code"],
        service=data["service"],
        status=data["status"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    ), None

