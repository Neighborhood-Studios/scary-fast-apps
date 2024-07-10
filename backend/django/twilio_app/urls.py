from django.urls import path

from . import views

urlpatterns = [
    path('request_verification', views.verify_phone_request),
    path('verify', views.verify_phone),
]
