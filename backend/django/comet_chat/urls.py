from django.urls import path

from comet_chat import views

urlpatterns = [
    path('get_auth_token', views.get_auth_token),
]
