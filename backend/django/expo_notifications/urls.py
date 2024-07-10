from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ExpoDeviceAuthorizedViewSet

router = DefaultRouter()
router.register(r'device/expo', ExpoDeviceAuthorizedViewSet)


urlpatterns = [
    path('', include(router.urls)),
]
