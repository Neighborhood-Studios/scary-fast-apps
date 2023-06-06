"""
Django settings for template project.

Generated by 'django-admin startproject' using Django 4.2.1.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""
import os

import dotenv

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

dotenv.read_dotenv(BASE_DIR, True)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-zamzfbodhhn2p_p)m7=pzzz^j4kosi0)q6gk_4_%^hl_y%hyuc'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG') == 'True'


ALLOWED_HOSTS = []


def get_ecs_healthcheck_ips():
    # https://docs.aws.amazon.com/AmazonECS/latest/userguide/task-metadata-endpoint-v3-fargate.html

    # this is probably better to be replaced with some static path that does not do any validation...
    import requests
    ip_addresses = []
    try:
        r = requests.get(os.getenv('ECS_CONTAINER_METADATA_URI_V4', '') + '/task', timeout=0.05)
    except requests.exceptions.RequestException:
        return []
    if r.ok:
        task_metadata = r.json()
        for container in task_metadata['Containers']:
            for network in container.get('Networks', []):
                if network['NetworkMode'] == 'awsvpc':
                    ip_addresses.extend(network['IPv4Addresses'])
    return list(set(ip_addresses))


ALLOWED_HOSTS += get_ecs_healthcheck_ips()


# Application definition

INSTALLED_APPS = [
    'users.apps.UsersConfig',
    'django_dramatiq',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_extensions',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'django_app.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'django_app.wsgi.application'

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DATA_DB_NAME'),
        'USER': os.getenv('DATA_DB_USER'),
        'PASSWORD': os.getenv('DATA_DB_PASSWORD'),
        'HOST': os.getenv('DATA_DB_HOST'),
        'PORT': os.getenv('DATA_DB_PORT'),
        'CONN_MAX_AGE': int(os.getenv('DATA_DB_CONN_MAX_AGE', 0)),
    }
}

# Password validation
# https://docs.djangoproject.com/en/4.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/4.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.2/howto/static-files/

STATIC_URL = 'static/'

STATIC_ROOT = os.getenv('STATIC_ROOT') or ''

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DRAMATIQ_REDIS_HOST = os.environ.get('DRAMATIQ_REDIS_HOST', '127.0.0.1')
DRAMATIQ_REDIS_PORT = os.environ.get('DRAMATIQ_REDIS_PORT')
DRAMATIQ_NAMESPACE = os.environ.get('DRAMATIQ_NAMESPACE', 'dramatiq_django')
DRAMATIQ_BROKER = {
    'BROKER': 'dramatiq.brokers.redis.RedisBroker',
    'OPTIONS': {
        'host': DRAMATIQ_REDIS_HOST,
        'port': DRAMATIQ_REDIS_PORT,
        'namespace': DRAMATIQ_NAMESPACE
    },
    'MIDDLEWARE': [
        'dramatiq.middleware.AgeLimit',
        'dramatiq.middleware.TimeLimit',
        'dramatiq.middleware.Callbacks',
        'dramatiq.middleware.Pipelines',
        'dramatiq.middleware.Retries',
        'django_dramatiq.middleware.AdminMiddleware',
        'django_dramatiq.middleware.DbConnectionsMiddleware',
    ]
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'timestamp': {
            'format': '{asctime} | {process} | {levelname} | {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'timestamp',
            'filters': ['require_debug_false'],
        },
        'console_debug': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'timestamp',
            'filters': ['require_debug_true'],
        },
    },
    'root': {
        'level': 'DEBUG',
        'handlers': [
            'console',
            'console_debug'
        ],
        'propagate': True,
    },
    'loggers': {

    }
}
