from __future__ import annotations

import redis.lock
from django.apps import apps
from django.conf import settings
from django.db import models


def make_redis_key(key):
    return '%s:%s' % (settings.DRAMATIQ_NAMESPACE, key)


class AttrForeignKey(models.ForeignKey):
    # override _id attribute mapping to be customizable
    def __init__(self, *args, **kwargs):
        self.id_attname = kwargs.pop('id_attname', None)
        super().__init__(*args, **kwargs)

    def get_attname(self):
        return self.id_attname or super().get_attname()

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if self.id_attname:
            kwargs['id_attname'] = self.id_attname
        return name, path, args, kwargs


def _make_redis_lock(key):
    redis_client = apps.get_app_config('django_app').redis
    return redis.lock.Lock(
        redis=redis_client,
        name=make_redis_key(key),
        timeout=600,
        blocking_timeout=600,
    )
