from django.urls import path

from . import views

urlpatterns = [
    path('da/api/v1/assign_role', views.assign_role),
    path('da/api/v1/unassign_role', views.unassign_role),
    # path('da/api/v1/user/save_ssn', views.save_ssn),
    path('da/api/v1/os/verify_user', views.os_identify_user_id),
    path('da/api/v1/os/verify_phone', views.os_identify_phone_number),
]
