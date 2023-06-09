from django.http import HttpResponse


class ELBHealthCheckMiddleware:
    # hook into request and return OK on specific path
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user_agent = request.META.get("HTTP_USER_AGENT")
        if user_agent is not None and user_agent.startswith('ELB-HealthChecker/'):
            if request.path == '/healthz':
                return HttpResponse('ok')
        return self.get_response(request)
