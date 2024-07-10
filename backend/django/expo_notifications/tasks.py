from uuid import uuid4

import dramatiq

from expo_notifications.models import ExpoDevice


@dramatiq.actor(min_backoff=60 * 5 * 1000, max_backoff=60 * 60 * 1000, max_retries=3)
def send_delayed_push(to_tokens: list[str], message):
    logger = send_delayed_push.logger
    correlation_id = str(uuid4())
    logger.info('send_delayed_push: %s stated with %s tokens', correlation_id, len(to_tokens))
    ExpoDevice.objects.filter(registration_id__in=to_tokens, active=True).send_message(
        message,
    )
    logger.info('send_delayed_push: %s finished', correlation_id)
