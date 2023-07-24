from django.urls import path

from . import views

urlpatterns = [
    path('da/api/v1/assign_role', views.assign_role),
    path('da/api/v1/unassign_role', views.unassign_role),
]
