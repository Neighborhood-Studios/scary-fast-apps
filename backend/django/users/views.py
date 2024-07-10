import hashlib
import hmac
import logging

import jwt
from django.conf import settings
from django.db import InternalError, IntegrityError
from django.http import JsonResponse, HttpResponseNotFound
from rest_framework import serializers
from rest_framework.decorators import api_view

from core_utils.a0_managment_utils import ManagementAPI
from core_utils.view_utils import get_token_auth_header
from django_app.constants import MANAGER_ROLES
from sendgrid_app.tasks import (
    send_employee_invitation_email, )
from users.models.role import RoleOrder
from users.models.user import Employee


class RoleAssignSerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=100)
    role_name = serializers.CharField(max_length=100)


class OSUserIdIdenSerializer(serializers.Serializer):
    user_id = serializers.CharField(max_length=100)


class OSPhoneNumberIdenSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=100)


class CreateEmployeeSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=100)
    role_name = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=100, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(max_length=100, allow_blank=True, allow_null=True)


class UpdateEmployeeSerializer(serializers.Serializer):
    employee_id = serializers.CharField(max_length=100)
    role_name = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=100, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(max_length=100, allow_blank=True, allow_null=True)
    active = serializers.BooleanField()


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

    res = _assign_role_internal(initiator_user_id, target_role_name, target_user_id)
    if res:
        return res

    return JsonResponse({'status': 'successful'}, status=200)


def _assign_role_internal(initiator_user_id, target_role_name, target_user_id):
    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    allowed = False
    target_role_order = RoleOrder.objects.get(role_name=target_role_name)
    highest_initiator_roleorder = None
    for role_order in RoleOrder.objects.filter(role_name__in=initiator_roles, can_assign=True):
        if highest_initiator_roleorder is None:
            highest_initiator_roleorder = role_order.order
        highest_initiator_roleorder = min(role_order.order, highest_initiator_roleorder)
        if role_order.order <= target_role_order.order:
            allowed = True
            break

    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)

    target_roles = []
    for role in mapi.get_user_roles(target_user_id):
        target_roles.append(role['name'])

    allowed = True
    for role_order in RoleOrder.objects.filter(role_name__in=target_roles):
        if role_order.order < highest_initiator_roleorder:
            allowed = False
            break

    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)

    # map role name to a0 id
    for role in mapi.get_roles_list():
        if role['name'] == target_role_name:
            mapi.assign_role_to_user(target_user_id, role['id'])
        elif role['name'] in target_roles:
            # remove all other roles
            mapi.remove_role_from_user(target_user_id, role['id'])
    return None


@api_view(['GET'])
def list_roles(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    logging.info('token payload: %s', payload)

    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    if not set(initiator_roles).intersection(MANAGER_ROLES):
        return HttpResponseNotFound()
    roles = mapi.get_roles_list()
    result = [
        {
            'name': x['name'],
            'description': x['description']
        }
        for x in roles
    ]

    return JsonResponse({'status': 'successful', 'roles': result}, status=200)


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
                         settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)

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

    return JsonResponse({'status': 'successful'}, status=200)


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

    return JsonResponse({'status': 'successful', 'user_id_hash': user_id_hash}, status=200)


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
    #                      settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)
    #
    # initiator_user = mapi.get_user(initiator_user_id)
    # if phone_number != initiator_user.get('app_metadata').get('phoneNumber'):
    #     return JsonResponse({'status': 'error', 'msg': 'number mismatch'}, status=403)

    phone_hash = hmac.new(
        bytes(settings.ONESIGNAL_API_KEY, 'UTF-8'),
        phone_number.encode(),
        hashlib.sha256
    ).hexdigest()

    return JsonResponse({'status': 'successful', 'phone_hash': phone_hash}, status=200)


@api_view(['POST'])
def create_employee(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    serializer = CreateEmployeeSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    target_email = serializer.validated_data['email']
    target_role_name = serializer.validated_data['role_name']

    logging.info('token payload: %s', payload)

    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    if not MANAGER_ROLES.intersection(set(initiator_roles)):
        return HttpResponseNotFound()

    allowed = False
    target_role_order = RoleOrder.objects.get(role_name=target_role_name)
    highest_initiator_roleorder = None
    for role_order in RoleOrder.objects.filter(role_name__in=initiator_roles, can_assign=True):
        if highest_initiator_roleorder is None:
            highest_initiator_roleorder = role_order.order
        highest_initiator_roleorder = min(role_order.order, highest_initiator_roleorder)
        if role_order.order <= target_role_order.order:
            allowed = True
            break

    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)
    try:
        new_employee = Employee.objects.create(
            email=target_email,
            role=target_role_name,
            first_name=serializer.validated_data['first_name'],
            last_name=serializer.validated_data['last_name'],
        )
    except (InternalError, IntegrityError):
        return JsonResponse({'status': 'email is already in use'}, status=400)

    send_employee_invitation_email.send_with_options(args=(target_email,))

    return JsonResponse({'status': 'successful', 'employee_id': new_employee.id}, status=200)


@api_view(['POST'])
def update_employee(request):
    token = get_token_auth_header(request)
    if not token:
        return HttpResponseNotFound()

    payload = jwt.decode(token, options={'verify_signature': False})
    initiator_user_id = payload.get('sub')

    serializer = UpdateEmployeeSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    target_employee_id = serializer.validated_data['employee_id']
    target_role_name = serializer.validated_data['role_name']
    target_active = serializer.validated_data['active']

    logging.info('token payload: %s', payload)

    mapi = ManagementAPI(settings.AUTH0_MANAGEMENT_CLIENT_ID,
                         settings.AUTH0_MANAGEMENT_CLIENT_SECRET,
                         settings.AUTH0_MANAGEMENT_CLIENT_DOMAIN)

    initiator_roles = []
    for role in mapi.get_user_roles(initiator_user_id):
        initiator_roles.append(role['name'])

    if not MANAGER_ROLES.intersection(set(initiator_roles)):
        return HttpResponseNotFound()

    allowed = False
    target_role_order = RoleOrder.objects.get(role_name=target_role_name)
    highest_initiator_roleorder = None
    for role_order in RoleOrder.objects.filter(role_name__in=initiator_roles, can_assign=True):
        if highest_initiator_roleorder is None:
            highest_initiator_roleorder = role_order.order
        highest_initiator_roleorder = min(role_order.order, highest_initiator_roleorder)
        if target_role_order.order >= role_order.order:
            allowed = True
            break
    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)

    employee = Employee.objects.get(id=target_employee_id)

    allowed = True
    for role_order in RoleOrder.objects.filter(role_name=employee.role):
        if role_order.order < highest_initiator_roleorder:
            allowed = False
            break

    if not allowed:
        return JsonResponse({'role_name': 'You do not have permissions for this actions'}, status=400)
    employee.first_name = serializer.validated_data['first_name']
    employee.last_name = serializer.validated_data['last_name']
    employee.role = target_role_name
    employee.active = target_active
    employee.save()

    if employee.user_id is not None:
        try:
            _assign_role_internal(initiator_user_id=initiator_user_id, target_role_name=target_role_name,
                                  target_user_id=employee.user_id)
        except Exception as e:
            logging.error('Failed to update employee a0 role: %s', e, exc_info=True)
            return JsonResponse({'status': 'a0 update failed'})

    return JsonResponse({'status': 'successful'}, status=200)


class InviteEmployeeSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)


@api_view(['POST'])
def invite_employee(request):
    serializer = InviteEmployeeSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=400)
    target_email = serializer.validated_data['email']

    # initiator_user_id = request.user
    # TBD: do we need to check the initiator's role before send the invitation?

    try:
        employee = Employee.objects.get(email=target_email)
        send_employee_invitation_email(employee.email)
    except Employee.DoesNotExist:
        return JsonResponse({'status': 'failed', 'message': 'not found'}, status=400)
    except Employee.MultipleObjectsReturned:
        return JsonResponse({'status': 'failed', 'message': 'multiple'}, status=409)
    except Exception as e:
        return JsonResponse({'status': 'failed', 'message': getattr(e, 'to_dict', str(e))}, status=500)

    return JsonResponse({'status': 'successful'}, status=200)

