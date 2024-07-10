import dramatiq
from django.db.models import Q
from dramatiq_crontab import cron

from treasuryprime_app.models import (
    ACHTransfer,
    ACH_STATUS_PENDING,
    ACH_STATUS_PROCESSING,
    ACH_STATUS_ERROR,
)
from treasuryprime_app.utils import retrieve_achs, make_transfer_sync_lock


@cron('*/5 * * * *')  # every 5 minutes...
@dramatiq.actor
def sync_transfers_tp():
    logger = sync_transfers_tp.logger
    logger.info('Treasury Prime: starting ACP transfers sync')

    with make_transfer_sync_lock():
        transfers = ACHTransfer.objects.filter(
            Q(status=ACH_STATUS_PENDING) | Q(status=ACH_STATUS_PROCESSING),
            active=True,
        ).order_by('created_at')

        if transfers.count() == 0:
            return

        achs, err = retrieve_achs(transfers.first().created_at, transfers.last().created_at)
        if err:
            logger.error("retrieve ACHs failed: '%s'; code: %d", err["status"], err["err_code"])
            return

        for transfer in transfers:

            ach = achs.get(transfer.id, None)
            if not ach:
                transfer.status = ACH_STATUS_ERROR
                transfer.error = "NODATA"
                transfer.save()
                continue

            transfer.updated_at = ach.updated_at
            transfer.effective_date = ach.effective_date
            transfer.error = ach.error
            transfer.status = ach.status

            transfer.save()
            transfer.update_related_status()
