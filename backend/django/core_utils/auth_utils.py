import logging

import json
from functools import wraps

import jwt
import requests

from django.contrib.auth import authenticate
from django.http import HttpRequest
from jwt.algorithms import RSAAlgorithm

from django.conf import settings

from jwt import PyJWKClient
from typing import Any

from core_utils.middleware.json_exception import JsonException

logger = logging.getLogger()


def jwt_get_username_from_payload_handler(payload):
    logger.info('got auth payload %s', payload)
    username = payload.get('sub').replace('|', '.')
    authenticate(remote_user=username)
    return username


def jwt_decode_token(token):
    header = jwt.get_unverified_header(token)
    jwks = requests.get('https://{}/.well-known/jwks.json'.format(settings.AUTH0_DOMAIN)).json()
    public_key = None
    for jwk in jwks['keys']:
        if jwk['kid'] == header['kid']:
            public_key = RSAAlgorithm.from_jwk(json.dumps(jwk))

    if public_key is None:
        raise Exception('Public key not found.')

    issuer = 'https://{}/'.format(settings.AUTH0_DOMAIN)
    return jwt.decode(token, public_key, audience=settings.AUTH0_API_IDENTIFIER, issuer=issuer,
                      algorithms=['RS256'])


class RequestToken(object):
    def __init__(self, token: str) -> None:
        self._token: str = token

        if token is not None:
            self._decoded: dict[str, Any] | None = self.__decode__()
        else:
            self._decoded = None

    def __decode__(self) -> dict[str, Any] | None:
        domain: str | None = settings.AUTH0_DOMAIN
        identifier: str | None = settings.AUTH0_API_IDENTIFIER

        if domain is None or identifier is None:
            raise JsonException(
                "AUTH0_DOMAIN or AUTH0_API_IDENTIFIER environment variables must be configured.",
                500,
            )

        issuer: str = "https://{}/".format(domain)
        logger.info('requesting %s', issuer + ".well-known/jwks.json")
        signing_key: Any = (
            PyJWKClient(issuer + ".well-known/jwks.json")
            .get_signing_key_from_jwt(self._token)
            .key
        )

        if signing_key is None:
            raise JsonException(
                "Could not retrieve a matching public key for the provided token.", 400
            )

        try:
            return jwt.decode(
                jwt=self._token,
                key=signing_key,
                algorithms=["RS256"],
                audience=identifier,
                issuer=issuer,
            )
        except Exception as e:
            logger.error('Decode error: %s', e, exc_info=True)
            raise JsonException("Could not decode the provided token.", 400)

    def __str__(self) -> str:
        return self._token

    def __getattr__(self, name: str) -> Any:
        return self._decoded[name]

    def has_permission(self, permission: str) -> bool:
        return permission in self._decoded["permissions"]

    def clear(self) -> None:
        self._decoded = None

    def is_authorized(self) -> bool:
        return self._decoded is not None

    def dict(self) -> dict[str, Any]:
        return self._decoded if self._decoded is not None else {}


def get_request_token(request: HttpRequest, mutate_request: bool = False) -> RequestToken | None:
    bearer_token: str | None = request.headers.get("Authorization")

    if bearer_token is None or not bearer_token.startswith("Bearer "):
        return None

    bearer_token = bearer_token.partition(" ")[2]

    if (
            request.META.get("token") is not None
            and request.META.get("bearer_token") == bearer_token
    ):
        return request.META.get("token")

    token: RequestToken = RequestToken(bearer_token)

    if mutate_request:
        request.META["token"] = token
        request.META["bearer_token"] = bearer_token

    return token


def authorized(function):
    @wraps(function)
    def wrap(request: HttpRequest, *args, **kwargs):
        token: RequestToken = get_request_token(request, mutate_request=True)

        if token is None or token.isAuthorized() is False:
            raise JsonException("Unauthorized.", 401)

        return function(request, token, *args, **kwargs)

    return wrap


def can(permission):
    def decor(function):
        @wraps(function)
        def wrap(request: HttpRequest, *args, **kwargs):
            token: RequestToken = get_request_token(request, mutate_request=True)

            if token is None or token.is_authorized() is False:
                raise JsonException("Unauthorized.", 401)

            if token.has_permission(permission) is False:
                raise JsonException("Forbidden.", 403)

            return function(request, token, *args, **kwargs)

        return wrap

    return decor
