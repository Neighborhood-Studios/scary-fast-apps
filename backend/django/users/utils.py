from core_utils.utils import _make_redis_lock


def make_user_lock(user_auth0id):
    return _make_redis_lock('lock:user_%s' % user_auth0id)
