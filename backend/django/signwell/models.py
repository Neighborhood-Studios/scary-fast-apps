# Create your models here.
from django.db import models
from django.db.models import UniqueConstraint

from core_utils.models import BaseModel
from users.models.user import User


class SignWellDocumentBase(BaseModel):
    title = models.CharField(null=True)

    template_id = models.CharField(null=True)
    class Meta:
        abstract = True


class SignWellSignedDocumentBase(BaseModel):
    class Meta:
        abstract = True

        constraints = [
            UniqueConstraint(fields=['user', 'document_id'], name='%(class)s_signwell_doc_signed_uniq')
        ]

    user = models.ForeignKey(User, on_delete=models.PROTECT, null=False)

    template_id = models.CharField(null=True)
    document_id = models.CharField(null=True)
    document_url = models.CharField(null=True, unique=True)
    signed = models.BooleanField(default=False)
    status = models.CharField(null=True)
    completed_pdf_url = models.CharField(null=True)
    embedded_preview_url = models.CharField(null=True)
    embedded_signing_url = models.CharField(null=True, unique=True)
