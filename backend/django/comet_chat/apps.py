from django.apps import AppConfig
from django.conf import settings

from comet_chat.client import CometChatClient


class CometChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'comet_chat'

    def __init__(self, *args, **kwargs):
        super(CometChatConfig, self).__init__(*args, **kwargs)
        self.client: CometChatClient | None = None

    def ready(self):
        super(CometChatConfig, self).ready()

        self.client = CometChatClient(
            api_url=settings.COMET_CHAT_API_URL,
            api_key=settings.COMET_CHAT_REST_KEY
        )

