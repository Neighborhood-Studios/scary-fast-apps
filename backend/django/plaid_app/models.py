import uuid
from typing import Any

import redis.lock
from django.apps import apps
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from plaid.model.transfer_authorization import TransferAuthorization

from core_utils.models import BaseModel
from plaid_app.utils import authorize_and_create_investment
from users.models.user import User


class PlaidInternal(BaseModel):
    # access with lock
    param_name = models.CharField(primary_key=True)
    value_num = models.DecimalField(null=True, decimal_places=4, max_digits=20)
    value_str = models.CharField(null=True)


class PlaidLink(BaseModel):
    user = models.OneToOneField(User, on_delete=models.PROTECT, null=False)
    active = models.BooleanField(default=False)
    plaid_user_id = models.UUIDField(default=uuid.uuid4, null=False)
    permanent_token = models.TextField(null=True)
    item_id = models.TextField(null=True, unique=True)  # webhook iden


class PlaidTransfer(BaseModel):
    id = models.CharField(primary_key=True, max_length=100)
    active = models.BooleanField(default=True)
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


class Investment(BaseModel):
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

    # class Meta:
        # constraints = [UniqueConstraint(fields=['user', 'deal'], condition=Q(active=True), name='investment_uniq')]

    user = models.ForeignKey(User, on_delete=models.PROTECT, null=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    transaction_id = models.OneToOneField(PlaidTransfer, null=True, unique=True, on_delete=models.PROTECT)

    invested_amount = models.DecimalField(null=False, max_digits=20, decimal_places=2)

    def create_transfer(self, user_present, device_ip, device_ua) -> tuple[TransferAuthorization | None, Any]:

        redis_client = apps.get_app_config('django_app').redis
        lock = redis.lock.Lock(redis=redis_client, name='user_transaction_lock_%s' % self.user.auth0id,
                               timeout=300, blocking_timeout=300)
        with lock:
            tracked_transfer, authorization, error = authorize_and_create_investment(
                user=self.user,
                amount=self.invested_amount,
                user_present=user_present,
                beacon_session_id=None,
                device_ua=device_ua,
                device_ip=device_ip,
            )
            if error and not tracked_transfer:
                return authorization, error
            self.transaction = tracked_transfer
            self.status = self.STATUS_TRS_IN_PROGRESS
            self.save()
            return authorization, None
