import dramatiq
import plaid
import redis.lock
from django.apps import apps
from django.db.models import Q
from django.db.transaction import atomic
from dramatiq_crontab import cron
from plaid.api.plaid_api import PlaidApi
from plaid.model.transfer_event import TransferEvent
from plaid.model.transfer_event_sync_request import TransferEventSyncRequest
from plaid.model.transfer_event_sync_response import TransferEventSyncResponse
from plaid.model.transfer_get_request import TransferGetRequest

from core_utils.utils import make_redis_key
from plaid_app.models import (
    PlaidInternal,
    PlaidTransferEvent,
    PlaidTransfer,
    STATUS_TRS_COMPLETE,
    STATUS_TRS_FAILED,
    STATUS_TRS_RETURNED,
    STATUS_TRS_CANCELED,
    PLAID_ITEM_STATUS_LOGIN_REQUIRED, PlaidLink,
)
from plaid_app.utils import (
    get_transfer_create_lock_name, format_account_name,
)


@cron('*/5 * * * *')  # every 5 minutes...
@dramatiq.actor()
def sync_transfers_plaid():
    logger = sync_transfers_plaid.logger
    logger.info('Plaid: starting transfer events sync')
    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(redis=redis_client, name=make_redis_key('transfer_sync_lock'),
                           timeout=600, blocking_timeout=600)
    with lock:
        last_id_obj, _ = PlaidInternal.objects.get_or_create(
            param_name='transfer_sync_last_event_id',
            defaults={
                'value_num': 0,
            }
        )
        last_id = int(last_id_obj.value_num)
        client: PlaidApi = apps.get_app_config('plaid_app').plaid_client

        plaid_request = TransferEventSyncRequest(
            after_id=last_id
        )

        try:
            response: TransferEventSyncResponse = client.transfer_event_sync(plaid_request)
        except Exception as e:
            logger.exception('Plaid: exception during transfer sync: %s', e)
            return
        try:
            for event in sorted(response.transfer_events, key=lambda x: x.event_id):  # type: TransferEvent
                logger.info('Plaid: new transfer event: %s', event.to_dict())
                # covert event type to str from custom object
                event_type = event.event_type.value if event.event_type else event.event_type

                last_id = max(last_id, event.event_id)
                transfer = PlaidTransfer.objects.filter(id=event.transfer_id).first()
                if not transfer:
                    logger.error('Plaid: no transfer %s found for event %s', event.transfer_id, event.event_id)

                    redis_client = apps.get_app_config('django_app').redis
                    transfer_create_lock = redis.lock.Lock(redis=redis_client, name=get_transfer_create_lock_name(),
                                                           timeout=300, blocking_timeout=300)
                    with transfer_create_lock:
                        # recheck
                        transfer = PlaidTransfer.objects.filter(id=event.transfer_id).first()
                        if not transfer:
                            # create orphaned transfer
                            logger.info('Plaid: creating new orphaned transfer: %s', event.transfer_id)
                            try:
                                transfer_get_response = client.transfer_get(
                                    transfer_get_request=TransferGetRequest(
                                        transfer_id=event.transfer_id,
                                    )
                                )
                                plaid_transfer = transfer_get_response.transfer.to_dict()
                                amount = transfer_get_response.transfer.amount
                                transfer_type = transfer_get_response.transfer.type.value
                            except Exception as e:
                                logger.exception('Plaid: exception during transfer get: %s', e)
                                plaid_transfer = {}
                                amount = 0
                                transfer_type = 'unknown'
                            transfer = PlaidTransfer(
                                id=event.transfer_id,
                                transfer_body=plaid_transfer,
                                authorization_body={},
                                transfer_status=event_type,
                                amount=amount,
                                transfer_type=transfer_type,
                            )
                            transfer.save()
                PlaidTransferEvent.objects.get_or_create(
                    event_id=event.event_id,
                    defaults=dict(
                        transfer_id=event.transfer_id,
                        event_body=event.to_dict(),
                        event_type=event_type,
                        event_timestamp=event.timestamp,  # convert???
                    )
                )
                if event_type:
                    # do indirect update
                    PlaidTransfer.objects.filter(id=event.transfer_id).update(transfer_status=event_type)
                    transfer_status = None
                    if event_type in ('settled',):
                        transfer_status = STATUS_TRS_COMPLETE
                    elif event_type in ('failed',):
                        transfer_status = STATUS_TRS_FAILED
                    elif event_type in ('cancelled',):
                        transfer_status = STATUS_TRS_CANCELED
                    elif event_type in ('returned',):
                        transfer_status = STATUS_TRS_RETURNED
                    if transfer_status is not None:
                        # todo: update related objects
                        pass

        except plaid.ApiException as e:
            logger.exception('Plaid: exception during transfer sync: %s', e)

        last_id_obj.value_num = int(last_id)
        last_id_obj.save()
    logger.info('Plaid: finished transfer events sync')


@dramatiq.actor()
def expire_local_plaid_link(link_id, account_details):
    logger = expire_local_plaid_link.logger

    try:
        link_data = PlaidLink.objects.get(
            pk=link_id,
            active=True,
        )
    except PlaidLink.DoesNotExist:
        return

    logger.info('expire_local_plaid_link: starting invalidation for link_id %s', link_id)
    with atomic():
        rows = PlaidLink.objects.filter(
            ~Q(item_status=PLAID_ITEM_STATUS_LOGIN_REQUIRED),
            pk=link_id,
            active=True,
        ).update(item_status=PLAID_ITEM_STATUS_LOGIN_REQUIRED)
        if not rows:
            logger.info('expire_local_plaid_link: (%s) no links were updated', link_id)
            return
        account, institution = account_details
        link_details = format_account_name(account, institution)

        # todo: handle, send email, etc.
