import logging

from django.conf import settings
from django.template.loader import render_to_string
from python_http_client import HTTPError
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From

from sendgrid_app.constants import SUPPORT_FROM

logger = logging.getLogger("SendGrid")


# https://docs.sendgrid.com/for-developers/sending-email/v3-python-code-example


def _send_email_message(message, email_type_name, rcpt_to):
    try:
        logger.info('sending %s email to %s', email_type_name, rcpt_to)
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        return response
    except HTTPError as e:
        logger.error('sending %s email to %s has failed: %s: %s', email_type_name, rcpt_to, e.status_code, e.reason)
        raise e
    except Exception as e:
        logger.error('sending %s email to %s has failed %s', email_type_name, str(e))
        raise e


def send_email_from_support(template_name: str, to_email: str, subject: str, plain_text_content: str | None,
                            template_kwargs: dict | None, email_type_name: str):
    if not to_email:
        return
    if template_kwargs is None:
        template_kwargs = {}
    html_content = render_to_string(template_name, {
        'app_domain_name': settings.APP_DOMAIN_NAME,
        'support_name': settings.SUPPORT_NAME,
        'support_email': settings.SUPPORT_EMAIL,
        **template_kwargs
    })

    message = Mail(
        from_email=From(SUPPORT_FROM),
        to_emails=to_email,
        subject=subject,
        plain_text_content=plain_text_content,
        html_content=html_content
    )

    _send_email_message(message, email_type_name, to_email)

