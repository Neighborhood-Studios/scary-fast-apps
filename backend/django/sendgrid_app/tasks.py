import dramatiq
from django.conf import settings

from sendgrid_app.utils import send_email_from_support


@dramatiq.actor
def send_employee_invitation_email(recipient_email):
    send_email_from_support(
        template_name='email/admin/invitation.html',
        to_email=recipient_email,
        subject='Welcome to <PROJECT_NAME> admin panel',
        plain_text_content='Welcome to <PROJECT_NAME>',
        template_kwargs={
            'app_link': f'https://{settings.APP_DOMAIN_NAME}'
        },
        email_type_name='invitation'
    )

