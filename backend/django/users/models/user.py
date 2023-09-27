import onesignal.model.notification
from django.apps import apps
from django.conf import settings
from django.db import models
from django.db.models import UniqueConstraint, Q

from core_utils.models import BaseModel


class User(BaseModel):
    class Meta:
        constraints = [UniqueConstraint(fields=['phone_number'], condition=Q(phone_verified=True), name='user_verified_phone_number_uniq')]

    auth0id = models.CharField(max_length=70, null=False, primary_key=True)
    first_name = models.CharField(max_length=150, null=True)
    last_name = models.CharField(max_length=150, null=True)
    last_seen = models.DateTimeField(null=True)

    phone_number = models.CharField(max_length=20, null=True)
    email = models.CharField(max_length=200, null=True)
    phone_verified = models.BooleanField(default=False)

    def send_push_notification(self, title, message, badge_type='SetTo', badge_count=1, **kwargs):
        notification = onesignal.model.notification.Notification(
            app_id=settings.ONESIGNAL_APP_ID,

            include_external_user_ids=[self.auth0id],
            channel_for_external_user_ids='push',

            # see https://documentation.onesignal.com/reference/push-channel-properties
            contents={'en': message},
            subtitle={'en': title},

            ios_badgeType=badge_type,
            ios_badgeCount=badge_count,

            **kwargs
        )
        return apps.get_app_config('django_app').os_client.create_notification(notification=notification)

    def send_sms_notification(self, message, analytics_name='generic', **kwargs):
        notification = onesignal.model.notification.Notification(
            app_id=settings.ONESIGNAL_APP_ID,
            include_external_user_ids=[self.auth0id],
            channel_for_external_user_ids='sms',

            # see https://documentation.onesignal.com/reference/sms-channel-properties
            contents={'en': message},
            name=analytics_name,
            sms_from=settings.ONESIGNAL_TWILIO_FROM_NUMBER,

            **kwargs
        )
        return apps.get_app_config('django_app').os_client.create_notification(notification=notification)

