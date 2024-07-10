import uuid

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from core_utils.models import BaseModel
from core_utils.utils import AttrForeignKey
from users.models.user import User

STATUS_PENDING = 'pending'
STATUS_TRS_REJECTED = 'transfer_rejected'
STATUS_TRS_IN_PROGRESS = 'transfer_in_progress'
STATUS_TRS_COMPLETE = 'transfer_complete'
STATUS_TRS_FAILED = 'transfer_failed'
STATUS_TRS_RETURNED = 'transfer_returned'
STATUS_TRS_CANCELED = 'transfer_canceled'
STATUS_CHOICES = (
    (STATUS_PENDING, STATUS_PENDING),
    (STATUS_TRS_REJECTED, STATUS_TRS_REJECTED),
    (STATUS_TRS_IN_PROGRESS, STATUS_TRS_IN_PROGRESS),
    (STATUS_TRS_COMPLETE, STATUS_TRS_COMPLETE),
    (STATUS_TRS_FAILED, STATUS_TRS_FAILED),
    (STATUS_TRS_RETURNED, STATUS_TRS_RETURNED),
    (STATUS_TRS_CANCELED, STATUS_TRS_CANCELED),
)

STATUS_FAILED_SET = {
    STATUS_TRS_RETURNED,
    STATUS_TRS_CANCELED,
    STATUS_TRS_REJECTED,
}

PLAID_ITEM_STATUS_NORMAL = 'normal'
PLAID_ITEM_STATUS_LOGIN_REQUIRED = 'login_required'
PLAID_ITEM_STATUS_PENDING_EXPIRATION = 'pending_expiration'  # set via webhook


class PlaidInternal(BaseModel):
    # access with lock
    param_name = models.CharField(primary_key=True)
    value_num = models.DecimalField(null=True, decimal_places=4, max_digits=20)
    value_str = models.CharField(null=True)


class PlaidLinkStatus(models.Model):
    # 'normal', 'login_required', 'pending_expiration'
    name = models.TextField(primary_key=True)
    description = models.TextField(null=True)


class PlaidLinkBase(BaseModel):
    class Meta:
        abstract = True

    active = models.BooleanField(default=False)
    plaid_user_id = models.UUIDField(default=uuid.uuid4, null=False)
    permanent_token = models.TextField(null=True)
    item_id = models.TextField(null=True, unique=True)  # webhook iden
    institution_meta_data = models.JSONField(null=False, encoder=DjangoJSONEncoder, default=dict)
    account_meta_data = models.JSONField(null=False, encoder=DjangoJSONEncoder, default=dict)

    item_status_fk = AttrForeignKey(PlaidLinkStatus,
                                    id_attname='item_status',
                                    on_delete=models.PROTECT, null=False, db_column='item_status',
                                    default=PLAID_ITEM_STATUS_NORMAL)


class PlaidLink(PlaidLinkBase):
    user = models.OneToOneField(User, on_delete=models.PROTECT, null=False)



class PlaidTransfer(BaseModel):
    id = models.CharField(primary_key=True, max_length=100)
    amount = models.DecimalField(decimal_places=2, max_digits=20)
    authorization_body = models.JSONField(null=False, encoder=DjangoJSONEncoder)
    transfer_body = models.JSONField(null=False, encoder=DjangoJSONEncoder)
    transfer_status = models.CharField(null=False)
    transfer_type = models.CharField(null=False)


class PlaidTransferEvent(BaseModel):
    event_id = models.PositiveIntegerField(primary_key=True)
    transfer = models.ForeignKey(PlaidTransfer, null=False, on_delete=models.PROTECT)

    event_body = models.JSONField(null=False, encoder=DjangoJSONEncoder)
    event_type = models.CharField(max_length=100, null=False)
    event_timestamp = models.DateTimeField(null=False)

