import hashlib
import hmac
import logging

import jwt
from django.conf import settings
from django.http import JsonResponse, HttpResponseNotFound
from rest_framework import serializers
from rest_framework.decorators import api_view

from core_utils.a0_managment_utils import ManagementAPI
from core_utils.view_utils import get_token_auth_header
from users.models.role import RoleOrder


class RoleAssignSerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=100)
    role_name = serializers.CharField(max_length=100)


class OSUserIdIdenSerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=100)


class OSPhoneNumberIdenSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=100)


@api_view(['POST'])
def assign_role(request):
    import re

    regex = re.compile('^HTTP_')
    logging.info(dict((regex.sub('', header), value) for (header, value)
                      in request.META.items() if header.startswith('HTTP_')))

    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    serializer = RoleAssignSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    target_user_id = serializer.validated_data['user_id']
    target_role_name = serializer.validated_data['role_name']

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    logging.info('token payload: %s', payload)

    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    allowed = False
    target_role_order = RoleOrder.objects.get(role_name=target_role_name)
    for role_order in RoleOrder.objects.filter(role_name__in=initiator_roles, can_assign=True):
        if role_order.order <= target_role_order.order:
            allowed = True
            break
    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)

    # map role name to a0 id
    for role in mapi.get_roles_list():
        if role['name'] == target_role_name:
            mapi.assign_role_to_user(target_user_id, role['id'])
            break

    return JsonResponse({'status': 'successful'})


@api_view(['POST'])
def unassign_role(request):
    import re

    regex = re.compile('^HTTP_')
    logging.info(dict((regex.sub('', header), value) for (header, value)
                      in request.META.items() if header.startswith('HTTP_')))

    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    serializer = RoleAssignSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    target_user_id = serializer.validated_data['user_id']
    target_role_name = serializer.validated_data['role_name']

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    logging.info('token payload: %s', payload)

    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    allowed = False
    target_role_order = RoleOrder.objects.get(role_name=target_role_name)
    for role_order in RoleOrder.objects.filter(role_name__in=initiator_roles, can_assign=True):
        if role_order.order <= target_role_order.order:
            allowed = True
            break
    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)

    # map role name to a0 id
    for role in mapi.get_roles_list():
        if role['name'] == target_role_name:
            mapi.remove_role_from_user(target_user_id, role['id'])
            break

    return JsonResponse({'status': 'successful'})


@api_view(['POST'])
def os_identify_user_id(request):
    # see https://documentation.onesignal.com/v11.0/docs/identity-verification
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    serializer = OSUserIdIdenSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    user_id = serializer.validated_data['user_id']
    if user_id != initiator_user_id:
        return HttpResponseNotFound()

    user_id_hash = hmac.new(
        bytes(settings.ONESIGNAL_API_KEY, 'UTF-8'),
        user_id.encode(),
        hashlib.sha256
    ).hexdigest()

    return JsonResponse({'status': 'successful', 'user_id_hash': user_id_hash})


@api_view(['POST'])
def os_identify_phone_number(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()
    serializer = OSPhoneNumberIdenSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    phone_number = serializer.validated_data['phone_number']

    # TODO: implement basic phone validation?
    # mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
    #                      settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
    #                      settings.AUTH0_DOMAIN)
    #
    # initiator_user = mapi.get_user(initiator_user_id)
    # if phone_number != initiator_user.get('app_metadata').get('phoneNumber'):
    #     return JsonResponse({'status': 'error', 'msg': 'number mismatch'}, status=403)

    phone_hash = hmac.new(
        bytes(settings.ONESIGNAL_API_KEY, 'UTF-8'),
        phone_number.encode(),
        hashlib.sha256
    ).hexdigest()

    return JsonResponse({'status': 'successful', 'phone_hash': phone_hash})
