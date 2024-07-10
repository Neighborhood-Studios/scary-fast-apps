import logging

from homegrown.models.signwell import SignWellInvestorSignedDocument
from homegrown.tasks import update_completed_pdf_url_delayed
from users.models.user import User


def document_event_handler(event, data, related_signer_email):
    document_id = data['id']
    related_recipient = related_signer_email and [r for r in data.get('recipients', []) if r['email'] == related_signer_email][0]
    related_user = related_recipient and User.objects.get(auth0id=related_recipient['id'])

    if related_user:
        logging.info('SignWell WebHook: %s by %s: "%s"', event,
                     related_recipient['name'], data['name'])
        signwell_user_document = SignWellInvestorSignedDocument.objects.filter(
            user=related_user, document_id=document_id
        ).first()
        if signwell_user_document:
            signwell_user_document.status = related_recipient['status']
            signwell_user_document.signed = event == 'document_signed' or signwell_user_document.signed
            signwell_user_document.save()

    else:
        logging.info('SignWell WebHook: %s: "%s"', event, data['name'])
        for recipient in data['recipients']:
            signwell_user_document = SignWellInvestorSignedDocument.objects.filter(
                user_id=recipient['id'], document_id=document_id
            ).first()
            if signwell_user_document:
                signwell_user_document.status = recipient['status']
                signwell_user_document.embedded_signing_url = recipient['embedded_signing_url']
                signwell_user_document.embedded_preview_url = data['embedded_preview_url']
                signwell_user_document.save()

    if event == 'document_completed':
        # wait 3 seconds and get its pdf url, then update DB record
        # (https://developers.signwell.com/reference/retrieving-the-completed-document-pdf)
        update_completed_pdf_url_delayed.send_with_options(args=(data['id'], 0), delay=1000 * 2)
