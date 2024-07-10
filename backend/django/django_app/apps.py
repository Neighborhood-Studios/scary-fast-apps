import onesignal
from django.apps import AppConfig
from django.conf import settings
from redis.client import Redis



class DjangoAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'django_app'

    def __init__(self, *args, **kwargs):
        super(DjangoAppConfig, self).__init__(*args, **kwargs)
        self.os_config = None
        self.os_client = None
        self.redis = None

    def ready(self):
        super(DjangoAppConfig, self).ready()

        self.redis = Redis(host=settings.DRAMATIQ_REDIS_HOST, port=settings.DRAMATIQ_REDIS_PORT,
                           socket_timeout=10, socket_connect_timeout=10)

        os_config = onesignal.Configuration(
            app_key=settings.ONESIGNAL_API_KEY,  # required for 99% endpoints
            user_key=None,  # only needed for managing apps
        )
        self.os_client = onesignal.ApiClient(configuration=os_config)
