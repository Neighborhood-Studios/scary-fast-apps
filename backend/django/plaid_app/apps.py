import plaid
from django.apps import AppConfig
from django.conf import settings
from plaid.api import plaid_api
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.accounts_balance_get_request_options import AccountsBalanceGetRequestOptions
from plaid.model_utils import cached_property


class AccountsBalanceGetRequestOptionsRight(AccountsBalanceGetRequestOptions):
    # noinspection PyMethodParameters
    @cached_property
    def openapi_types():
        """
        This must be a method because a model may have properties that are
        of type self, this must run after the class is loaded

        Returns
            openapi_types (dict): The key is attribute name
                and the value is attribute type.
        """
        return {
            'account_ids': ([str],),  # noqa: E501
            'min_last_updated_datetime': (str,),  # noqa: E501
        }


class AccountsBalanceGetRequestRight(AccountsBalanceGetRequest):
    # noinspection PyMethodParameters
    @cached_property
    def openapi_types():
        """
        This must be a method because a model may have properties that are
        of type self, this must run after the class is loaded

        Returns
            openapi_types (dict): The key is attribute name
                and the value is attribute type.
        """
        from plaid.model.accounts_balance_get_request_payment_details import AccountsBalanceGetRequestPaymentDetails

        return {
            'access_token': (str,),  # noqa: E501
            'secret': (str,),  # noqa: E501
            'client_id': (str,),  # noqa: E501
            'options': (AccountsBalanceGetRequestOptionsRight,),  # noqa: E501
            'payment_details': (AccountsBalanceGetRequestPaymentDetails,),  # noqa: E501
        }


class PlaidAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'plaid_app'

    def __init__(self, *args, **kwargs):
        super(PlaidAppConfig, self).__init__(*args, **kwargs)
        self.plaid_client = None

    def ready(self):
        super(PlaidAppConfig, self).ready()

        plaid_config = plaid.Configuration(
            host=getattr(plaid.Environment, settings.PLAID_ENV),
            api_key={
                'clientId': settings.PLAID_CLIENT_ID,
                'secret': settings.PLAID_SECRET,
            }
        )

        self.plaid_client = plaid_api.PlaidApi(plaid.ApiClient(configuration=plaid_config))

        # hackintosh...
        self.plaid_client.accounts_balance_get_endpoint.openapi_types.update({
            'accounts_balance_get_request': (AccountsBalanceGetRequestRight,),
        })
