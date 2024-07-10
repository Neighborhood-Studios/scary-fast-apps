from django.urls import path

from stripe_app import views

urlpatterns = [
    path('initiate_setup_intent', views.initiate_setup_intent),
    path('payment_method/list', views.get_payment_methods),
    path('payment_method/detach', views.detach_payment_method),
    path('refund/refresh', views.refresh_refund),
    # path('webhook', views.webhook),
]
