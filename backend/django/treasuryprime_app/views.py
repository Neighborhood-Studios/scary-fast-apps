import base64
import json
import logging

import redis.lock
from django.apps import apps
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import serializers
from rest_framework.decorators import api_view

from core_utils.permissions import IsStaff
from core_utils.utils import make_redis_key
from treasuryprime_app.models import ACHTransfer
from treasuryprime_app.utils import (
    create_counterparty,
    retrieve_ach_by_url,
    make_transfer_sync_lock,
)
from users.models.user import User


class CounterpartyIDSerializer(serializers.Serializer):
    counterparty_id = serializers.CharField(required=True)
    user_id = serializers.CharField(required=False, default=None)


class CreateCounterpartySerializer(serializers.Serializer):
    account_name = serializers.CharField(required=True)
    ach_account_number = serializers.CharField(max_length=34, required=True)
    ach_account_type = serializers.ChoiceField(choices=(
        ("checking", "checking"),
        ("savings", "savings"),
    ), required=True)
    ach_routing_number = serializers.CharField(max_length=9, required=True)
    user_id = serializers.CharField(required=False, default=None)



@api_view(['POST'])
def create_counterparty_api(request):
    serializer = CreateCounterpartySerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    if IsStaff().has_permission(request, None):  # Manager can add counterparty directly
        target_user_id = serializer.validated_data.get('user_id', None)
        if not target_user_id:
            return JsonResponse({'status': 'user_id must be specified'}, status=400)
        target_user = User.objects.filter(auth0id=target_user_id).first()
    else:
        target_user = User.objects.filter(auth0id=request.user.username).first()
    if not target_user:
        return JsonResponse({"status": "user not found"}, status=404)

    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(
        redis=redis_client,
        name=make_redis_key(f'user_counterparty_{target_user.auth0id}'),
        timeout=600,
        blocking_timeout=600,
    )

    with lock:
        # refresh
        target_user = User.objects.filter(pk=target_user.pk).first()

        if target_user.counterparty_links.filter(active=True).exists():
            return JsonResponse({"status": "user already has TreasuryPrime linked account"}, status=400)

        item, err = create_counterparty(
            serializer.validated_data["account_name"],
            serializer.validated_data["ach_account_number"],
            serializer.validated_data["ach_account_type"],
            serializer.validated_data["ach_routing_number"],
        )
        if err is not None:
            return JsonResponse({"status": err["status"]}, status=err["err_code"])

        item.user = target_user
        item.save()

    return JsonResponse({"counterparty_id": item.id, "ach": item.ach}, status=200)


@api_view(['POST'])
def deactivate_counterparty_api(request):
    serializer = CounterpartyIDSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    if IsStaff().has_permission(request, None):  # Manager can deactivate counterparty directly
        target_user_id = serializer.validated_data.get('user_id', None)
        if not target_user_id:
            return JsonResponse({'status': 'user_id must be specified'}, status=400)
        target_user = User.objects.filter(auth0id=target_user_id).first()
    else:
        target_user = User.objects.filter(auth0id=request.user.username).first()
    if not target_user:
        return JsonResponse({"status": "user not found"}, status=404)

    redis_client = apps.get_app_config('django_app').redis
    lock = redis.lock.Lock(
        redis=redis_client,
        name=make_redis_key(f'user_counterparty_{target_user.auth0id}'),
        timeout=600,
        blocking_timeout=600,
    )

    with lock:
        target_user = User.objects.filter(auth0id=target_user.auth0id).first()

        affected = target_user.counterparty_links.filter(
            id=serializer.validated_data["counterparty_id"],
            active=True
        ).update(active=False)
        if not affected:
            return JsonResponse({"status": "counterparty not found"}, status=404)

    return JsonResponse({"counterparty_id": serializer.validated_data["counterparty_id"], "active": False}, status=200)


@csrf_exempt
def webhook(request):
    auth64 = request.headers.get('Authorization', '').split('Basic ')[-1]
    try:
        username, passwd = base64.b64decode(auth64).decode("utf-8").split(":")
        if username != settings.TREASURY_PRIME_WEBHOOK_USERNAME or passwd != settings.TREASURY_PRIME_WEBHOOK_PASSWORD:
            return JsonResponse({'status': 'not authorized!!'}, status=401)
    except Exception as e:
        logging.error('tp.webhook: unhandled error %s', e, exc_info=True)
        return JsonResponse({'status': 'not authorized'}, status=401)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'status': 'bad request'}, status=400)

    logging.info("tp.webhook: got webhook data: %s", data)

    ach, err = retrieve_ach_by_url(data["url"])
    if err:
        logging.error(err)
        return JsonResponse({'status': err["status"]}, status=err["err_code"])

    with make_transfer_sync_lock():
        transfer = ACHTransfer.objects.filter(id=ach.id).first()
        if not transfer:
            logging.error("TP webhook: ACHTransfer not found by id %s", ach.id)
            return JsonResponse({'status': 'not found'}, status=404)

        transfer.updated_at = ach.updated_at
        transfer.effective_date = ach.effective_date
        transfer.error = ach.error
        transfer.status = ach.status

        transfer.save()
        transfer.update_related_status()

    return JsonResponse({'status': 'ok'}, status=200)
