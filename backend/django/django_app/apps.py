import onesignal
from django.apps import AppConfig
from django.conf import settings


class DjangoAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'django_app'

    def __init__(self, *args, **kwargs):
        super(DjangoAppConfig, self).__init__(*args, **kwargs)
        self.os_config = None
        self.os_client = None

    def ready(self):
        super(DjangoAppConfig, self).ready()
        self.os_config = onesignal.Configuration(
            app_key=settings.ONESIGNAL_API_KEY,  # required for 99% endpoints
            user_key=None,  # only needed for managing apps
        )
        self.os_client = onesignal.ApiClient(configuration=self.os_config)
