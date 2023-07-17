from django.db import models

class BaseModel(models.Model):
    created_date = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_date = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        abstract = True
