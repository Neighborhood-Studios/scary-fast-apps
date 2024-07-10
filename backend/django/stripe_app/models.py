import stripe
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db.models import UniqueConstraint, Q

from core_utils.models import BaseModel
from users.models.user import User


class UserStripeLink(BaseModel):
    customer_id = models.CharField(max_length=150, null=False, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT, null=False, related_name='stripe_links')

    class Meta:
        constraints = [UniqueConstraint(fields=['user'], condition=Q(active=True),
                                        name='user_stripe_link_active_uniq')]


class PaymentIntent(BaseModel):
    id = models.CharField(max_length=150, null=False, primary_key=True)
    customer = models.ForeignKey(UserStripeLink, on_delete=models.PROTECT, null=True)

    amount = models.IntegerField(null=False)
    # requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, or succeeded
    status = models.CharField(max_length=150, null=False)

    raw_data = models.JSONField(null=True, default=dict, encoder=DjangoJSONEncoder)


class Charge(BaseModel):  # aka actual payment from customer, or "attempt to move money to us"
    id = models.CharField(max_length=150, null=False, primary_key=True)
    customer = models.ForeignKey(UserStripeLink, on_delete=models.PROTECT, null=True)
    payment_intent = models.ForeignKey(PaymentIntent, on_delete=models.PROTECT, null=True)

    # succeeded, pending, or failed
    status = models.CharField(max_length=150, null=False)
    amount = models.IntegerField(null=False)

    raw_data = models.JSONField(null=True, default=dict, encoder=DjangoJSONEncoder)


class Refund(BaseModel):
    id = models.CharField(max_length=150, null=False, primary_key=True)
    customer = models.ForeignKey(UserStripeLink, on_delete=models.PROTECT, null=True)
    payment_intent = models.ForeignKey(PaymentIntent, on_delete=models.PROTECT, null=True)

    # pending, requires_action, succeeded, failed, or canceled
    status = models.CharField(max_length=150, null=False)
    amount = models.IntegerField(null=False)

    raw_data = models.JSONField(null=True, default=dict, encoder=DjangoJSONEncoder)

    def refresh_from_stripe(self):
        stripe_refund = stripe.Refund.retrieve(
            self.id,
        )
        self.status = stripe_refund['status'],
        self.raw_data = stripe_refund.serialize(None)

