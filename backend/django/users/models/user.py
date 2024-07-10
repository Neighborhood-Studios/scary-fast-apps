import onesignal.model.notification
from django.apps import apps
from django.conf import settings
from django.contrib.auth.base_user import BaseUserManager
from django.db import models
from django.db.models import UniqueConstraint, Q

from core_utils.models import BaseModel
from expo_notifications.models import ExpoDevice
from expo_notifications.tasks import send_delayed_push
from twilio_app.tasks import send_sms_message


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username, email=None, password=None, **extra_fields):
        return self._create_user(username, email, **extra_fields)

    def _create_user(self, username, email, **extra_fields):
        """
        Create and save a user with the given username, email, and password.
        """
        if not username:
            raise ValueError("The given username must be set")
        email = self.normalize_email(email)
        # Lookup the real model class from the global app registry so this
        # manager method can be used in migrations. This is fine because
        # managers are by definition working on the real model.
        GlobalUserModel = apps.get_model(
            self.model._meta.app_label, self.model._meta.object_name
        )
        username = GlobalUserModel.normalize_username(username)
        user = self.model(username=username, email=email, **extra_fields)
        user.save(using=self._db)
        return user

    def send_sms_message(self, message, **kwargs):
        if self.exists():
            numbers = list(self.filter(active=True).values_list(
                "phone_number", flat=True
            ))
            return send_sms_message(to_numbers=numbers, message=message)
        return []


class User(BaseModel):
    auth0id = models.CharField(max_length=70, null=False, primary_key=True)

    first_name = models.CharField(max_length=150, null=True)
    last_name = models.CharField(max_length=150, null=True)

    last_seen = models.DateTimeField(null=True)

    phone_number = models.CharField(max_length=20, null=True)
    phone_verified = models.BooleanField(default=False)

    email = models.EmailField(max_length=200, null=True)

    blocked = models.BooleanField(default=False)

    class Meta:
        constraints = [UniqueConstraint(fields=['phone_number'], condition=Q(phone_verified=True, active=True),
                                        name='user_verified_phone_number_uniq')]

    objects = UserManager()

    EMAIL_FIELD = "email"
    USERNAME_FIELD = "auth0id"
    REQUIRED_FIELDS = []

    @property
    def username(self):
        # clutch for libs and some of our code
        return self.auth0id

    @property
    def is_active(self):
        return self.active

    @property
    def is_anonymous(self):
        """
        Always return False. This is a way of comparing User objects to
        anonymous users.
        """
        return False

    @property
    def is_authenticated(self):
        """
        Always return True. This is a way to tell if the user has been
        authenticated in templates.
        """
        return True

    def send_push_message(self, message):
        tokens = list(ExpoDevice.objects.filter(user=self, active=True).values_list('registration_id', flat=True))
        if not tokens:
            return
        send_delayed_push.send(to_tokens=tokens, message=message)

    def send_sms_message(self, message):
        send_sms_message.send(to_numbers=[self.phone_number], message=message)

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


class Employee(BaseModel):
    email = models.EmailField(max_length=100, null=False, unique=True)
    role = models.CharField(max_length=100, null=False)
    user = models.OneToOneField(User, on_delete=models.PROTECT, null=True)

    first_name = models.CharField(max_length=150, null=True)
    last_name = models.CharField(max_length=150, null=True)

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, related_name='%(class)s_created_by')
