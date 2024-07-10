from django.db import models
from push_notifications.models import Device

from expo_notifications.utils import send_push_message


class ExpoDeviceQuerySet(models.query.QuerySet):
    def send_message(self, message, **kwargs):
        if self.exists():
            app_ids = self.filter(active=True).order_by("application_id").values_list(
                "application_id", flat=True
            ).distinct()
            failed_tokens = []
            for app_id in app_ids:
                expo_push_tokens = list(self.filter(active=True, application_id=app_id).values_list(
                    "registration_id", flat=True
                ))
                failed_tokens.extend(send_push_message(
                    tokens=expo_push_tokens,
                    message=message,
                    **kwargs
                ) or [])
            return failed_tokens


class ExpoDevice(Device):
    registration_id = models.CharField(
        verbose_name="ExponentPushToken[xxxxxxxxxxxxxx]", max_length=200, unique=True
    )

    objects = ExpoDeviceQuerySet.as_manager()

    class Meta:
        verbose_name = "Expo device"

    def send_message(self, message, **kwargs):
        return send_push_message(
            tokens=[self.registration_id],
            message=message,
            **kwargs
        )
