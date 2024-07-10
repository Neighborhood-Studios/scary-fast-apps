from django.urls import path

from . import views

urlpatterns = [
    path("create_counterparty", views.create_counterparty_api),
    path("deactivate_counterparty", views.deactivate_counterparty_api),
    path('wh', views.webhook),
]
