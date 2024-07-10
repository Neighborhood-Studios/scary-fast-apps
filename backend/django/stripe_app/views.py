import logging

import stripe
from django.conf import settings
from django.http import HttpResponseNotFound, JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from stripe import StripeError

from core_utils.permissions import IsStaff
from stripe_app.models import UserStripeLink, Refund
from users.models.user import User
from users.utils import make_user_lock

logger = logging.getLogger(__name__)


@api_view(['POST'])
def initiate_setup_intent(request):
    initiator_user_id = request.user.username

    user = User.objects.filter(auth0id=initiator_user_id, active=True).first()
    if user is None:
        return HttpResponseNotFound()

    user_profile = user.user_profile

    with make_user_lock(user.auth0id):
        user_link = user.stripe_links.filter(active=True).first()
        # create stripe customer if not exists already
        if user_link is None:
            # todo: can this call fail???
            # https://docs.stripe.com/api/customers/create?lang=python
            customer = stripe.Customer.create(
                name=f'{user_profile.first_name} {user_profile.last_name}',
                email=user.email,
                metadata={'internal_user_id': str(user.auth0id)}
            )
            customer_id = customer['id']
            user_link = UserStripeLink(user=user, customer_id=customer_id)
            user_link.save()
        else:
            customer_id = user_link.customer_id

        # todo: check if user already has active payment type?
        ephemeral_key = stripe.EphemeralKey.create(
            customer=customer_id,
            stripe_version='2022-11-15',
        )

        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            # payment methods setup via stripe dashboard
            automatic_payment_methods={
                'enabled': True,
            },
        )
        response = {
            'setupIntent': setup_intent.client_secret,
            'ephemeralKey': ephemeral_key.secret,
            'customer': customer_id,
            'publishableKey': settings.STRIPE_PUBLISHABLE_KEY
        }
        return JsonResponse(response, status=200)


@api_view(['GET'])
def get_payment_methods(request):

    initiator_user_id = request.user.username

    user = User.objects.filter(auth0id=initiator_user_id, active=True).first()
    if user is None:
        return HttpResponseNotFound()

    user_link = user.stripe_links.filter(active=True).first()
    if not user_link:
        return JsonResponse({'status': 'error', 'error': 'stripe not connected'}, status=400)
    customer_id = user_link.customer_id

    params = {}
    starting_after = request.query_params.get('starting_after')
    if starting_after:
        params['starting_after'] = starting_after

    # add error handling?
    # https://docs.stripe.com/api/payment_methods/customer_list
    payment_methods = stripe.Customer.list_payment_methods(
        customer_id,
        type='card',  # we only deal with card-like methods for now
        **params
    )
    data_dict = payment_methods.to_dict_recursive()
    if 'url' in data_dict:
        del data_dict['url']
    return JsonResponse(data_dict, status=200)


class DetachPaymentMethodSerializer(serializers.Serializer):
    payment_method_id = serializers.CharField(required=True, max_length=1000)


@api_view(['POST'])
def detach_payment_method(request):
    initiator_user_id = request.user.username

    user = User.objects.filter(auth0id=initiator_user_id, active=True).first()
    if user is None:
        return HttpResponseNotFound()

    serializer = DetachPaymentMethodSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    payment_method_id = serializer.validated_data['payment_method_id']

    user_link = user.stripe_links.filter(active=True).first()
    if not user_link:
        return JsonResponse({'status': 'error', 'error': 'stripe not connected'}, status=400)
    customer_id = user_link.customer_id

    # check if user has said payment method
    try:
        stripe.Customer.retrieve_payment_method(
            customer_id,
            payment_method_id,
        )
    except StripeError as e:
        err = e.error
        logger.error('detach_payment_method: StripeError code is: %s', err.code)
        return JsonResponse({'status': 'error', 'error': 'unexpected error, try again later'}, status=400)

    stripe.PaymentMethod.detach(payment_method_id)

    return JsonResponse({'status': 'ok'})


class RefreshRefundSerializer(serializers.Serializer):
    refund_id = serializers.CharField(required=True, max_length=150)


@api_view(['POST'])
@permission_classes([IsStaff])
def refresh_refund(request):
    serializer = RefreshRefundSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    refund_id = serializer.validated_data['refund_id']

    logger.info('refresh_refund: started refresh for %s', refund_id)

    refund = get_object_or_404(Refund, refund_id)

    # FixMe: http error handling?
    refund.refresh_from_stripe()
    refund.save()

    return JsonResponse({'status': 'ok'})
