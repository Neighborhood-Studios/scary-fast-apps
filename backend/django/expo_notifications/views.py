from exponent_server_sdk import PushClient
from push_notifications.api.rest_framework import DeviceViewSetMixin, AuthorizedMixin, DeviceSerializerMixin
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import ModelSerializer
from rest_framework.viewsets import ModelViewSet

from expo_notifications.models import ExpoDevice


class ExpoDeviceSerializer(ModelSerializer):
    class Meta(DeviceSerializerMixin.Meta):
        model = ExpoDevice
        fields = tuple(field for field in DeviceSerializerMixin.Meta.fields if field != 'device_id')

    def validate_registration_id(self, value):
        if PushClient.is_exponent_push_token(value) is None:
            raise ValidationError("Registration ID (expo token) is invalid")

        return value


class ExpoDeviceViewSet(DeviceViewSetMixin, ModelViewSet):
    queryset = ExpoDevice.objects.all()
    serializer_class = ExpoDeviceSerializer


class ExpoDeviceAuthorizedViewSet(AuthorizedMixin, ExpoDeviceViewSet):
    pass
