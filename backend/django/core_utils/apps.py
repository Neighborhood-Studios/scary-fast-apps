import os

from django.apps import AppConfig


class CoreUtilsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core_utils'

    def ready(self):
        from django.conf import settings

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

        ips = get_ecs_healthcheck_ips()
        if ips:
            settings.ALLOWED_HOSTS.extend(ips)
