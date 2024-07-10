from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db.models import UniqueConstraint, Q

from core_utils.models import BaseModel
from users.models.user import User

ACH_STATUS_PENDING = 'pending'
ACH_STATUS_CANCELED = 'canceled'
ACH_STATUS_PROCESSING = 'processing'
ACH_STATUS_ERROR = 'error'
ACH_STATUS_SENT = 'sent'
ACH_STATUS_RETURNED = 'returned'
ACH_STATUS_CHOICES = (
    (ACH_STATUS_PENDING, ACH_STATUS_PENDING),
    (ACH_STATUS_CANCELED, ACH_STATUS_CANCELED),
    (ACH_STATUS_ERROR, ACH_STATUS_ERROR),
    (ACH_STATUS_SENT, ACH_STATUS_SENT),
    (ACH_STATUS_RETURNED, ACH_STATUS_RETURNED),
)

ACH_SEC_CODE_CCD = 'ccd'
ACH_SEC_CODE_CIE = 'cie'
ACH_SEC_CODE_PPD = 'ppd'
ACH_SEC_CODE_TEL = 'tel'
ACH_SEC_CODE_WEB = 'web'
ACH_SEC_CODE_CHOICES = (
    (ACH_SEC_CODE_CCD, ACH_SEC_CODE_CCD),
    (ACH_SEC_CODE_CIE, ACH_SEC_CODE_CIE),
    (ACH_SEC_CODE_PPD, ACH_SEC_CODE_PPD),
    (ACH_SEC_CODE_TEL, ACH_SEC_CODE_TEL),
    (ACH_SEC_CODE_WEB, ACH_SEC_CODE_WEB),
)

ACH_DIRECTION_CREDIT = 'credit'
ACH_DIRECTION_DEBIT = 'debit'
ACH_DIRECTION_CHOICES = (
    (ACH_DIRECTION_CREDIT, ACH_DIRECTION_CREDIT),
    (ACH_DIRECTION_DEBIT, ACH_DIRECTION_DEBIT),
)

ACH_SERVICE_STANDARD = 'standard'
ACH_SERVICE_SAMEDAY = 'sameday'
ACH_SERVICE_CHOICES = (
    (ACH_SERVICE_STANDARD, ACH_SERVICE_STANDARD),
    (ACH_SERVICE_SAMEDAY, ACH_SERVICE_SAMEDAY),
)


class CounterpartyLinkBase(BaseModel):
    class Meta:
        abstract = True

    id = models.CharField(max_length=100, primary_key=True)
    name_on_account = models.CharField(max_length=100, null=False)
    ach = models.JSONField(null=False, encoder=DjangoJSONEncoder, default=dict)


class CounterpartyLink(CounterpartyLinkBase):
    class Meta(CounterpartyLinkBase.Meta):
        abstract = False
        constraints = [
            UniqueConstraint(fields=["user"], condition=Q(active=True), name="unique_counterpartylink_user")
        ]

    user = models.ForeignKey(User, on_delete=models.PROTECT, null=False, related_name="counterparty_links")


class ACHTransfer(BaseModel):
    id = models.CharField(max_length=100, primary_key=True)
    account_id = models.CharField(max_length=100)
    amount = models.DecimalField(decimal_places=2, max_digits=20)
    counterparty = models.ForeignKey(CounterpartyLink, on_delete=models.PROTECT)
    direction = models.CharField(max_length=10, choices=ACH_DIRECTION_CHOICES)
    effective_date = models.DateTimeField()
    error = models.CharField(max_length=10, null=True)
    sec_code = models.CharField(max_length=3, choices=ACH_SEC_CODE_CHOICES)
    service = models.CharField(max_length=10, choices=ACH_SERVICE_CHOICES)
    status = models.CharField(max_length=10, choices=ACH_STATUS_CHOICES)

    @staticmethod
    def _treasuryprime_plaid_status_converter(tp_status):
        from plaid_app.models import (
            STATUS_PENDING,
            STATUS_TRS_IN_PROGRESS,
            STATUS_TRS_COMPLETE,
            STATUS_TRS_FAILED,
            STATUS_TRS_RETURNED,
            STATUS_TRS_CANCELED,
        )

        status_map = {
            ACH_STATUS_PENDING: STATUS_PENDING,
            ACH_STATUS_CANCELED: STATUS_TRS_CANCELED,
            ACH_STATUS_PROCESSING: STATUS_TRS_IN_PROGRESS,
            ACH_STATUS_ERROR: STATUS_TRS_FAILED,
            ACH_STATUS_SENT: STATUS_TRS_COMPLETE,
            ACH_STATUS_RETURNED: STATUS_TRS_RETURNED,
        }

        return status_map[tp_status]

    def update_related_status(self):
        pass
