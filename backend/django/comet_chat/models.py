import uuid

from django.db import models

from core_utils.models import BaseModel
from users.models.user import User


class UserChatLink(BaseModel):
    uid = models.UUIDField(default=uuid.uuid4, primary_key=True)
    user = models.OneToOneField(User, on_delete=models.PROTECT, unique=True)


class O2OChatGroup(BaseModel):
    group_id = models.UUIDField(primary_key=True)
    group_name = models.CharField(max_length=100)
    from_user = models.ForeignKey(UserChatLink, on_delete=models.PROTECT, related_name='from_o2o_group')
    to_user = models.ForeignKey(UserChatLink, on_delete=models.PROTECT, related_name='to_o2o_group')
