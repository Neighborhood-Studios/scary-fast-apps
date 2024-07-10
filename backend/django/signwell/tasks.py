import logging

import dramatiq
import requests
from django.conf import settings

@dramatiq.actor
def update_completed_pdf_url_delayed(document_id, attempt):
    logging.info('SignWell: delayed task to Update Completed PDF url for document %s', document_id)
    completed_pdf_url = get_completed_pdf_url(document_id)
    if completed_pdf_url:
        # todo: define SignWellSignedDocument, see models
        signwell_documents = SignWellSignedDocument.objects.filter(
           document_id=document_id
        )
        signwell_documents.update(completed_pdf_url=completed_pdf_url)
        for signwell_document in signwell_documents:
            signwell_document.save()
    elif attempt < 3:
        logging.info("SignWell: get document PDF for %s next try in 2s", document_id)
        update_completed_pdf_url_delayed.send_with_options(args=(document_id, attempt+1), delay=1000 * 2)
    else:
        logging.info("SignWell: get document PDF for %s has failed", document_id)


def get_completed_pdf_url(document_id):
    url = f"https://www.signwell.com/api/v1/documents/{document_id}/completed_pdf/?url_only=true"
    headers = {
        "X-Api-Key": settings.SIGNWELL_API_KEY,
        "content-type": "application/json"
    }
    response = None
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        logging.error('SignWell: get_signwell_completed_document for %s error %s, response: %s', document_id, e, response.text)
        return None

    data = response.json()
    return data.get('file_url')
