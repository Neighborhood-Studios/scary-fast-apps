import logging

import dramatiq
import plaid
import redis.lock
from django.apps import apps
from dramatiq_crontab import cron
from plaid.api.plaid_api import PlaidApi
from plaid.model.transfer_event import TransferEvent
from plaid.model.transfer_event_sync_request import TransferEventSyncRequest
from plaid.model.transfer_event_sync_response import TransferEventSyncResponse
from plaid.model.transfer_get_request import TransferGetRequest

from plaid_app.models import PlaidInternal, PlaidTransferEvent, PlaidTransfer, Investment


@cron('*/20 * * * *')  # every 20 minutes...
@dramatiq.actor
def sync_transfers():
    logging.info('Plaid: starting transfer events sync')
    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(redis=redis_client, name='transfer_sync_lock',
                           timeout=600, blocking_timeout=600)
    with lock:
        last_id_obj, _ = PlaidInternal.objects.get_or_create(
            param_name='transfer_sync_last_event_id',
            defaults={
                'value_num': 0,
            }
        )
        last_id = int(last_id_obj.value_num)
        client: PlaidApi = apps.get_app_config('django_app').plaid_client

        plaid_request = TransferEventSyncRequest(
            after_id=last_id
        )

        try:
            response: TransferEventSyncResponse = client.transfer_event_sync(plaid_request)
            for event in sorted(response.transfer_events, key=lambda x: x.event_id):  # type: TransferEvent
                logging.info('Plaid: new transfer event: %s', event.to_dict())

                last_id = max(last_id, event.event_id)
                transfer = PlaidTransfer.objects.filter(id=event.transfer_id).first()
                if not transfer:
                    logging.error('Plaid: no transfer %s found for event %s', event.transfer_id, event.event_id)

                    redis_client = apps.get_app_config('django_app').redis
                    transfer_create_lock = redis.lock.Lock(redis=redis_client, name='lock:transfer_create',
                                                           timeout=300, blocking_timeout=300)
                    with transfer_create_lock:
                        # recheck
                        transfer = PlaidTransfer.objects.filter(id=event.transfer_id).first()
                        if not transfer:
                            # create orphaned transfer
                            logging.info('Plaid: creating new orphaned transfer: %s', event.transfer_id)
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
                                logging.exception('Plaid: exception during transfer get: %s', e)
                                plaid_transfer = {}
                                amount = 0
                                transfer_type = 'unknown'
                            transfer = PlaidTransfer(
                                id=event.transfer_id,
                                transfer_body=plaid_transfer,
                                authorization_body={},
                                transfer_status=event.event_type,
                                amount=amount,
                                transfer_type=transfer_type,
                            )
                            transfer.save()
                PlaidTransferEvent.objects.get_or_create(
                    event_id=event.event_id,
                    defaults=dict(
                        transfer_id=event.transfer_id,
                        event_body=event.to_dict(),
                        event_type=event.event_type,
                        event_timestamp=event.timestamp,  # convert???
                    )
                )
                if event.event_type:
                    # do indirect update
                    PlaidTransfer.objects.filter(id=event.transfer_id).update(transfer_status=event.event_type)
                    invest_status = None
                    if event.event_type in ('settled',):
                        invest_status = Investment.STATUS_TRS_COMPLETE
                    elif event.event_type in ('failed',):
                        invest_status = Investment.STATUS_TRS_FAILED
                    elif event.event_type in ('cancelled',):
                        invest_status = Investment.STATUS_TRS_CANCELED
                    elif event.event_type in ('returned',):
                        invest_status = Investment.STATUS_TRS_RETURNED
                    if invest_status is not None and hasattr(transfer, 'investment') and transfer.investment:
                        Investment.objects.filter(id=transfer.investment.id).update(status=event.event_type)
        except plaid.ApiException as e:
            logging.exception('Plaid: exception during transfer sync: %s', e)

        last_id_obj.value_num = int(last_id)
        last_id_obj.save()
    logging.info('Plaid: finished transfer events sync')
