import stripe
from django.apps import AppConfig
from django.conf import settings


class StripeAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stripe_app'

    def ready(self):
        stripe.api_key = settings.STRIPE_API_KEY
