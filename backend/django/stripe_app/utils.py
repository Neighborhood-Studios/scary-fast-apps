import logging

import stripe

from stripe_app.constants import PAY_INTENT_STATUS_SUCCEEDED
from stripe_app.models import PaymentIntent, Refund

logger = logging.getLogger(__name__)


def charge_user(amount, user) -> PaymentIntent:
    user_link = user.stripe_links.filter(active=True).first()
    if not user_link:
        logger.error('charge_user: user do not connected stripe...')
    customer_id = user_link.customer_id
    payment_methods = stripe.PaymentMethod.list(
        customer=customer_id,
        type='card',
    )
    if not payment_methods['data']:
        logger.error('charge_user: user do not have payment methods...')
    try:
        stripe_p_int = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            customer=customer_id,
            payment_method=payment_methods['data'][0]['id'],  # grab first for now
            off_session=True,
            confirm=True,
        )
    except stripe.error.CardError as e:
        err = e.error
        # Error code will be authentication_required if authentication is needed
        logger.error('charge_user: CardError code is: %s', err.code)
        payment_intent_id = err.payment_intent['id']
        stripe_p_int = stripe.PaymentIntent.retrieve(payment_intent_id)
    p_int = PaymentIntent.objects.create(
        id=stripe_p_int['id'],
        customer=user_link,
        status=stripe_p_int['status'],
        raw_data=stripe_p_int.serialize(None),
        amount=stripe_p_int['amount'],
    )
    return p_int


def refund_payment_intent(pi_id) -> Refund:
    payment_intent = PaymentIntent.objects.get(pi_id)
    stripe_p_int = stripe.PaymentIntent.retrieve(pi_id)
    # recheck latest status
    if stripe_p_int['status'] != PAY_INTENT_STATUS_SUCCEEDED:
        logger.error('refund_payment_intent: attempt to refund non-complete payment intent %s', pi_id)

    stripe_refund = stripe.Refund.create(
        payment_intent=payment_intent.id,
    )

    refund = Refund.objects.create(
        id=stripe_refund['id'],
        amount=payment_intent.amount,
        customer=payment_intent.customer,
        status=stripe_refund['status'],
        raw_data=stripe_refund.serialize(None)
    )
    return refund
