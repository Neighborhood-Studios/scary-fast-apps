from django.urls import path

from . import views

urlpatterns = [
    path('assign_role', views.assign_role),
    path('unassign_role', views.unassign_role),
    path('list_roles', views.list_roles),
    #
    # path('os/verify_user', views.os_identify_user_id),
    # path('os/verify_phone', views.os_identify_phone_number),

    path('employee/create', views.create_employee),
    path('employee/update', views.update_employee),
    path('employee/invite', views.invite_employee),

]
