from django.urls import path

from . import views

urlpatterns = [
    path('exchange_public_token', views.exchange_public_token),
    path('create_link_token', views.create_link_token),
    path('update_link_token', views.update_link_token),
    path('accounts', views.get_accounts),
    path('balance', views.get_balance),
    path('item', views.get_item),
    path('item_remove', views.remove_item),
    path('wh', views.webhook),
]
