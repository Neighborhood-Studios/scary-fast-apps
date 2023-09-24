from django.urls import path

from . import views

urlpatterns = [
    path('da/api/v1/plaid/exchange_public_token', views.exchange_public_token),
    path('da/api/v1/plaid/create_link_token', views.create_link_token),
    path('da/api/v1/plaid/update_link_token', views.update_link_token),
    path('da/api/v1/plaid/accounts', views.get_accounts),
    path('da/api/v1/plaid/balance', views.get_balance),
    path('da/api/v1/plaid/item', views.get_item),
    path('da/api/v1/plaid/item_remove', views.remove_item),
    path('da/api/v1/plaid/test_transfer', views.test_transfer),
    path('da/api/v1/plaid/wh', views.webhook),
]
