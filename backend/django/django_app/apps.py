import onesignal
import plaid
from django.apps import AppConfig
from django.conf import settings
from plaid.api import plaid_api
from redis.client import Redis


class DjangoAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'django_app'

    def __init__(self, *args, **kwargs):
        super(DjangoAppConfig, self).__init__(*args, **kwargs)
        self.os_config = None
        self.os_client = None
        self.plaid_client = None
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

        plaid_config = plaid.Configuration(
            host=getattr(plaid.Environment, settings.PLAID_ENV),
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )
        self.plaid_client = plaid_api.PlaidApi(plaid.ApiClient(configuration=plaid_config))
