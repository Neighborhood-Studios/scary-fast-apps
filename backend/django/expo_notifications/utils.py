import logging
import time

import requests
from django.conf import settings
from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
    PushTicket,
)
from requests.exceptions import ConnectionError, HTTPError

logger = logging.getLogger(__name__)


class RetryAgain(Exception):
    pass


def send_push_message(tokens, message, extra=None) -> list:
    if not settings.EXPO_NOTIFICATIONS_TOKEN:
        return []
    if not extra:
        extra = {}

    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Bearer {settings.EXPO_NOTIFICATIONS_TOKEN}",
            "accept": "application/json",
            "accept-encoding": "gzip, deflate",
            "content-type": "application/json",
        }
    )

    retry_count = 3
    while True:
        retry_tokens = _send_push_message(session, tokens, message, extra, log_error=retry_count >= 0)
        if retry_tokens and retry_count >= 0:
            retry_count -= 1
            continue
        if retry_tokens:
            logger.error('send_push_message: error sending to %s tokens', len(retry_tokens))
        break
    return retry_tokens


def _send_push_message(session, tokens, message, extra, log_error):
    from expo_notifications.models import ExpoDevice

    retry_count = 3

    push_tickets = None
    while True:
        try:
            push_tickets = _send_push_request(session, tokens, message, extra, log_error=retry_count >= 0)
        except RetryAgain:
            if retry_count >= 0:
                retry_count -= 1
                time.sleep(10)
                continue
            return []
        break

    if not push_tickets:
        return []

    retry_tokens = []
    for push_ticket in push_tickets:
        try:
            # We got a response back, but we don't know whether it's an error yet.
            # This call raises errors so we can handle them with normal exception
            # flows.
            push_ticket.validate_response()
        except DeviceNotRegisteredError:
            # Mark the push token as inactive
            token = push_ticket.push_message.to
            logger.info('_send_push_message: invalidating token %s', token)
            ExpoDevice.objects.filter(token=token).update(active=False)
        except PushTicketError as e:
            # Encountered some other per-notification error.
            log_f = logger.warning
            exc_info = False
            if log_error:
                log_f = logger.error
                exc_info = True
            log_f('_send_push_message: error sending notification: %s', e, exc_info=exc_info)
            retry_tokens.append(push_ticket.push_message.to)
        except Exception as e:
            # log and continue for now...
            logger.error('_send_push_message: unhandled exception while parsing push ticket: %s', e, exc_info=True)

    return retry_tokens


def _send_push_request(session, tokens, message, extra, log_error):
    try:
        messages = [PushMessage(to=token,
                                body=message,
                                **extra) for token in tokens if PushClient.is_exponent_push_token(token)]
        if not messages:
            return []
        push_tickets: list[PushTicket] = PushClient(session=session).publish_multiple(messages)
    except PushServerError as e:
        # Encountered some likely formatting/validation error.
        logger.error('_send_push_request: error sending notification: %s', e, exc_info=True)
        raise
    except (ConnectionError, HTTPError) as e:
        log_f = logger.warning
        exc_info = False
        if log_error:
            log_f = logger.error
            exc_info = True

        log_f('_send_push_request: error sending notification: %s', e, exc_info=exc_info)
        raise RetryAgain()
    return push_tickets
