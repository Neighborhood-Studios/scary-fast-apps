import time
from uuid import uuid4

import dramatiq
from django.conf import settings
from twilio.rest import Client


@dramatiq.actor(min_backoff=60 * 5 * 1000, max_backoff=60 * 60 * 1000, max_retries=3)
def send_sms_message(to_numbers: list[str], message):
    if not settings.TWILIO_FROM_NUMBER:
        return []
    logger = send_sms_message.logger
    correlation_id = str(uuid4())
    logger.info('send_delayed_sms: %s stated with %s numbers', correlation_id, len(to_numbers))
    client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    failed_numbers = []

    for number in to_numbers:
        try:
            message = client.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=number
            )
        except Exception as e:
            failed_numbers.append(number)
            # TODO: add retry depending on the error, first we need to figure out what this can raise...if it can raise
            logger.error('send_delayed_sms: failed to send sms to %s: %s', number, e, exc_info=True)
            time.sleep(3)  # arbitrary value

    logger.info('send_delayed_sms: %s finished', correlation_id)
