import logging

from rest_framework.permissions import BasePermission

from core_utils.auth_utils import get_user_role_from_request
from django_app.constants import MANAGER_ROLES
from users.models.user import Employee, User


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        # check if user is authenticated at all before checking for roles, request object may have no token...
        if not bool(request.user and request.user.is_authenticated):
            return False

        user_role = get_user_role_from_request(request)
        try:
            user = User.objects.get(auth0id=request.user.username)
            employee = Employee.objects.filter(user=user, active=True).exists()
        except User.DoesNotExist:
            return False
        except Exception as e:
            logging.error('Unhandled exception while trying to user/employee %s', e, exc_info=True)
            return False

        return bool(employee and user_role in MANAGER_ROLES)


class HasRole(BasePermission):
    def has_permission(self, request, view):
        # check if user is authenticated at all before checking for roles
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(get_user_role_from_request(request))


class HasNoRole(BasePermission):
    def has_permission(self, request, view):
        # check if user is authenticated at all before checking for roles
        if not bool(request.user and request.user.is_authenticated):
            return False
        return not bool(get_user_role_from_request(request))
