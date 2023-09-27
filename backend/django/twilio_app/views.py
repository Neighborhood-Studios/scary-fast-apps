import logging

import jwt
import redis.lock
from django.apps import apps
from django.conf import settings
from django.db import InternalError, IntegrityError
from django.http import HttpResponseNotFound, JsonResponse
from dramatiq.rate_limits import WindowRateLimiter
from rest_framework import serializers
from rest_framework.decorators import api_view
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from core_utils.view_utils import get_token_auth_header
from users.models.user import User


class RequestVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=100)


class VerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=100)
    otp_code = serializers.CharField(max_length=100)


RESENT_TIMEOUT = 60  # seconds


@api_view(['POST'])
def verify_phone_request(request):
    token = get_token_auth_header(request)
    # log headers for debug
    # logging.info('headers "%s"', '",\n"'.join('%s ::: %s' % (k, v) for k, v in request.headers.items()))
    if not token:
        return HttpResponseNotFound()
    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    user = list(User.objects.filter(auth0id=initiator_user_id).all())
    if not user:
        return HttpResponseNotFound()

    serializer = RequestVerifySerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    phone_number = serializer.validated_data['phone_number']

    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(redis=redis_client, name='user_verify_%s' % phone_number,
                           timeout=30, blocking_timeout=30)
    with lock:
        rate_limit = WindowRateLimiter(key='rl_user_verify_%s' % phone_number, backend=redis_client, limit=2,
                                       window=RESENT_TIMEOUT)
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        verify_service = client.verify.v2.services(settings.TWILIO_VERIFY_SID)
        if not rate_limit.acquire(raise_on_failure=False):
            # TODO: also rate limit by ip?
            return JsonResponse({'status': 'too many requests', 'resent_timeout': RESENT_TIMEOUT}, status=429)
        try:
            verification = verify_service.verifications.create(to=phone_number, channel="sms")
        except TwilioRestException as e:
            if e.status == 400:
                if 'Invalid parameter `To`' in e.msg:
                    return JsonResponse({'status': 'invalid phone number'}, status=400)
                return JsonResponse({'status': 'bad request'}, status=400)
            logging.exception('Unhandled exception while handling twilio: %s', e)
            return JsonResponse({'status': 'internal error'}, status=500)

        logging.info('verification.status: %s', verification.status)

        return JsonResponse({'status': 'sms sent', 'resent_timeout': RESENT_TIMEOUT})


@api_view(['POST'])
def verify_phone(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    user = User.objects.get(auth0id=initiator_user_id)

    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(redis=redis_client, name='user_verify_%s' % user.phone_number,
                           timeout=30, blocking_timeout=30)
    with lock:
        serializer = VerifySerializer(data=request.data)
        if not serializer.is_valid():
            return JsonResponse(serializer.errors, status=400)
        phone_number = serializer.validated_data['phone_number']

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        verify_service = client.verify.v2.services(settings.TWILIO_VERIFY_SID)

        try:
            verification_check = verify_service.verification_checks.create(to=phone_number,
                                                                           code=serializer.validated_data['otp_code'])
        except TwilioRestException as e:
            if e.status == 429:
                return JsonResponse({'status': 'too many requests'}, status=429)
            if e.status == 404:
                return JsonResponse({'status': 'invalid'}, status=404)
            logging.exception('Unhandled exception while handling twilio: %s', e)
            return JsonResponse({'status': 'internal error'}, status=500)

        logging.info('verification_check.status %s', verification_check.status)

        if verification_check.status == 'approved':
            user.phone_number = phone_number
            user.phone_verified = True
            try:
                user.save()
            except (InternalError, IntegrityError) as e:
                if 'user_verified_phone_number_uniq' in str(e):
                    return JsonResponse({'status': 'phone is already in use'}, status=400)
                logging.exception('Unhandled exception while saving user: %s', e)
                return JsonResponse({'status': 'internal error'}, status=500)

        return JsonResponse({'status': verification_check.status})
