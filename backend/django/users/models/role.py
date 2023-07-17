from django.db import models

from core_utils.models import BaseModel


class RoleOrder(BaseModel):
    role_name = models.CharField(max_length=70, null=False)
    order = models.PositiveIntegerField()
    can_assign = models.BooleanField(default=False)
    can_remove = models.BooleanField(default=False)
