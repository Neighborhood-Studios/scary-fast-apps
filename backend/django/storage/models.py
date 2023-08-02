from django.db import models

import users.models.user
from core_utils.models import BaseModel


# Create your models here.


class Buckets(BaseModel):
    id = models.CharField(max_length=200, null=False, primary_key=True)

    download_expiration = models.PositiveIntegerField(default=30, null=False)
    min_upload_file_size = models.PositiveIntegerField(default=1, null=False)
    max_upload_file_size = models.PositiveIntegerField(default=50000000, null=False)
    cache_control = models.CharField(default='max-age=3600', null=False)
    presigned_urls_enabled = models.BooleanField(default=True, null=False)


class Files(BaseModel):
    id = models.UUIDField(primary_key=True)
    bucket_id = models.ForeignKey(Buckets, on_delete=models.CASCADE, null=False)
    name = models.TextField(null=True)
    size = models.PositiveIntegerField(null=True)
    mime_type = models.TextField(null=True)
    etag = models.TextField(null=True)

    is_uploaded = models.BooleanField(default=False, null=True)
    uploaded_by_user_id = models.ForeignKey(users.models.user.User, null=True, on_delete=models.CASCADE)
