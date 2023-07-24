import json
import logging

import redis.lock
import requests
from django.conf import settings
from redis.client import Redis
from rest_framework.status import HTTP_401_UNAUTHORIZED

logger = logging.getLogger()

TOKEN_EXPIRE = 86000  # a0 default minus 400

DEFAULT_TIMEOUT = 10


class ManagementAPI:
    def __init__(self, client_id, client_secret, domain):
        self.base_url = 'https://%s/' % domain
        self.domain = domain
        self.audience = 'https://%s/api/v2/' % domain
        self.client_secret = client_secret
        self.client_id = client_id
        self.grant_type = 'client_credentials'

        self.management_token = None
        logger.info('connecting to Redis(host=%s, port=%s)', settings.DRAMATIQ_REDIS_HOST, settings.DRAMATIQ_REDIS_PORT)
        self.redis = Redis(host=settings.DRAMATIQ_REDIS_HOST, port=settings.DRAMATIQ_REDIS_PORT,
                           socket_timeout=10, socket_connect_timeout=10)
        self.redis_cache_key = self._get_redis_cache_key()
        logger.info('Lock init')
        self.auth_lock = redis.lock.Lock(redis=self.redis, name=self.redis_cache_key + '_auth_lock',
                                         timeout=30, blocking_timeout=30)
        logger.info('Redis init complete?')

        self.session = requests.Session()

    def _get_redis_cache_key(self):
        return '%s:management_key_%s' % (settings.DRAMATIQ_NAMESPACE, self.domain)

    def get_new_token(self):
        self.management_token = self._get_cached_token()
        if not self.management_token:
            with self.auth_lock:
                # recheck condition
                self.management_token = self._get_cached_token()
                if self.management_token is None:
                    try:
                        self._create_fresh_token()
                    except Exception as e:
                        logger.error('ManagementAPI: Failed to get fresh management token: %s', e, exc_info=True)

    def _create_fresh_token(self):
        logger.info('_create_fresh_token')
        url = self.base_url + 'oauth/token'
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "audience": self.audience,
            "grant_type": self.grant_type,
        }
        resp = self.session.post(
            url,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data=data,
        )
        resp.raise_for_status()
        data = json.loads(resp.text)
        self.management_token = data['access_token']
        self._cache_token(int(data.get('expires_in', TOKEN_EXPIRE)))

    def _cache_token(self, expire):
        self.redis.set(self.redis_cache_key, self.management_token, ex=expire)

    def _get_cached_token(self):
        val = self.redis.get(self.redis_cache_key)
        if val:
            # redis returns bytes, but we need a string otherwise auth will fail
            return val.decode('utf-8')
        return None

    def make_api_call(self, method, url, params=None, json_data=None, timeout=DEFAULT_TIMEOUT,
                      session=None) -> requests.Response:
        if not session:
            session = self.session
        if not self.management_token:
            self.get_new_token()

        def _make_req():
            logger.info('ManagementAip: Making %s request to: %s with %s (%s)', method, url, params, json_data)
            _resp = getattr(session, method)(
                url,
                params=params,
                timeout=timeout,
                json=json_data,
                headers={
                    'Authorization': 'Bearer %s' % self.management_token,
                }
            )
            _resp.raise_for_status()
            return _resp

        retry_once = True
        while True:
            try:
                return _make_req()
            except Exception as e:
                retry = retry_once
                retry_once = False

                log_func = logger.warning if retry else logger.error
                log_func('ManagementAPI: Failed %s attempt for %s: %s', method, url, e)
                if not retry:
                    raise
                if isinstance(e, requests.HTTPError) and e.response is not None:
                    if e.response.status_code == HTTP_401_UNAUTHORIZED:
                        # attempt to get new token
                        try:
                            current_token = self.management_token
                            with self.auth_lock:
                                new_token = self._get_cached_token()
                                # recheck that token was not updated
                                if new_token is None or current_token == new_token:
                                    self._create_fresh_token()
                                else:
                                    self.management_token = new_token
                        except Exception as e:
                            logger.error('ManagementAPI: Failed to get fresh management token: %s', e, exc_info=True)
                            continue

    def get_user_roles(self, user_id):
        # returns assigned roles
        url = self.base_url + 'api/v2/users/%s/roles' % user_id
        data = self.make_api_call('get', url)
        # example data:
        # [
        #     {
        #         "id": "rol_uqD7Yn1viJjEWJJh",
        #         "name": "manager",
        #         "description": "Manager user. Has more rights than regular user"
        #     },
        #     {
        #         "id": "rol_4GRghm6JzjokvP12",
        #         "name": "sales person",
        #         "description": "sdlkfjildsf"
        #     }
        # ]
        return data.json()

    def get_roles_list(self):
        # returns global roles list
        url = self.base_url + 'api/v2/roles'
        data = self.make_api_call('get', url)
        # example data:
        # [
        #     {
        #         "id": "rol_uqD7Yn1viJjEWJJh",
        #         "name": "manager",
        #         "description": "Manager user. Has more rights than regular user"
        #     },
        #     {
        #         "id": "rol_4GRghm6JzjokvP12",
        #         "name": "sales person",
        #         "description": "sdlkfjildsf"
        #     }
        # ]
        return data.json()

    def assign_role_to_user(self, user_id, role_id):
        url = self.base_url + 'api/v2/users/%s/roles' % user_id
        self.make_api_call('post', url, json_data={
            "roles": [
                role_id
            ]
        })

    def remove_role_from_user(self, user_id, role_id):
        url = self.base_url + 'api/v2/users/%s/roles' % user_id
        self.make_api_call('delete', url, json_data={
            "roles": [
                role_id
            ]
        })
