from django.urls import path

from . import views

urlpatterns = [
    path('da/api/v1/phone/request_verification', views.verify_phone_request),
    path('da/api/v1/phone/verify', views.verify_phone),
]
