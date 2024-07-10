from django.urls import path

from signwell import views

urlpatterns = [
    path('get_document', views.get_signwell_document),
    path('get_completed_document', views.get_signwell_completed_document),
    path('send_reminder', views.send_document_reminder_to_user),
    path('events', views.webhook_events_endpoint),
]
