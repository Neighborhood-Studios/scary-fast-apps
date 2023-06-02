import { loadEnv } from 'vite';
import { Configuration, PlaidApi, Products, PlaidEnvironments } from 'plaid';

const env = loadEnv('development', process.cwd(), '');
const PLAID_CLIENT_ID = env.VITE_APP_PLAID_CLIENT_ID;
const PLAID_SECRET = env.VITE_APP_PLAID_SECRET;
const PLAID_ENV = env.VITE_APP_PLAID_ENV || 'sandbox';

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = (
  env.VITE_APP_PLAID_PRODUCTS || Products.Transactions
).split(',');

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (env.VITE_APP_PLAID_COUNTRY_CODES || 'US').split(
  ','
);

// Parameters used for the OAuth redirect Link flow.
//
// Set PLAID_REDIRECT_URI to 'http://localhost:3000'
// The OAuth redirect flow requires an endpoint on the developer's website
// that the bank website should redirect to. You will need to configure
// this redirect URI for your client ID through the Plaid developer dashboard
// at https://dashboard.plaid.com/team/api.
const PLAID_REDIRECT_URI = env.VITE_APP_PLAID_REDIRECT_URI || '';

// We store the access_token in memory - in production, store it in a secure
// persistent data store
let ACCESS_TOKEN = null;
let PUBLIC_TOKEN = null;
let ITEM_ID = null;
// The payment_id is only relevant for the UK/EU Payment Initiation product.
// We store the payment_id in memory - in production, store it in a secure
// persistent data store along with the Payment metadata, such as userId .
let PAYMENT_ID = null;
// The transfer_id is only relevant for Transfer ACH product.
// We store the transfer_id in memory - in production, store it in a secure
// persistent data store
let TRANSFER_ID = null;

// Initialize the Plaid client
// Find your API keys in the Dashboard (https://dashboard.plaid.com/account/keys)

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

const client = new PlaidApi(configuration);

export async function plaidBESimulator(endpoint, requestData) {
  console.log('[plaidBESimulator]:', { endpoint, requestData });
  switch (endpoint) {
    case '/info':
      return getInfo();
    case '/create_link_token':
      return createLinkToken();
    case '/create_link_token_for_payment':
      return createLinkPaymentToken();
    case '/set_access_token':
      return setAccessToken(requestData.public_token);
    case '/item':
      return getItemInfo();
    default:
      console.log(`[plaidBESimulator]: unknown endpoint "${endpoint}"`);
      return 'unknown endpoint';
  }
}

function getInfo() {
  return {
    item_id: ITEM_ID,
    access_token: ACCESS_TOKEN,
    products: PLAID_PRODUCTS,
  };
}

function createLinkToken() {
  return Promise.resolve().then(async function () {
    const configs = {
      user: {
        // This should correspond to a unique id for the current user.
        client_user_id: 'user-id',
      },
      client_name: 'Plaid Quickstart',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      redirect_uri: PLAID_REDIRECT_URI || undefined,
    };

    const createTokenResponse = await client.linkTokenCreate(configs);
    return createTokenResponse.data;
  });
}

function setAccessToken(public_token) {
  PUBLIC_TOKEN = public_token;
  return Promise.resolve(public_token)
    .then((public_token) =>
      client.itemPublicTokenExchange({
        public_token,
      })
    )
    .then(async (tokenResponse) => {
      ACCESS_TOKEN = tokenResponse.data.access_token;
      ITEM_ID = tokenResponse.data.item_id;
      if (PLAID_PRODUCTS.includes(Products.Transfer)) {
        TRANSFER_ID = await authorizeAndCreateTransfer(ACCESS_TOKEN);
      }

      return {
        // the 'access_token' is a private token, DO NOT pass this token to the frontend in your production environment
        access_token: ACCESS_TOKEN,
        item_id: ITEM_ID,
        error: null,
      };
    });
}

function getItemInfo() {
  return Promise.resolve().then(async () => {
    // Pull the Item - this includes information about available products,
    // billed products, webhook information, and more.
    const itemResponse = await client.itemGet({
      access_token: ACCESS_TOKEN,
    });
    // Also pull information about the institution
    const configs = {
      institution_id: itemResponse.data.item.institution_id,
      country_codes: PLAID_COUNTRY_CODES,
    };
    const instResponse = await client.institutionsGetById(configs);
    return {
      item: itemResponse.data.item,
      institution: instResponse.data.institution,
    };
  });
}

function createLinkPaymentToken() {
  return Promise.resolve().then(async () => {
    const createRecipientResponse =
      await client.paymentInitiationRecipientCreate({
        name: 'Harry Potter',
        iban: 'GB33BUKB20201555555555',
        address: {
          street: ['4 Privet Drive'],
          city: 'Little Whinging',
          postal_code: '11111',
          country: 'GB',
        },
      });
    const recipientId = createRecipientResponse.data.recipient_id;

    const createPaymentResponse = await client.paymentInitiationPaymentCreate({
      recipient_id: recipientId,
      reference: 'paymentRef',
      amount: {
        value: 1.23,
        currency: 'GBP',
      },
    });
    const paymentId = createPaymentResponse.data.payment_id;

    // We store the payment_id in memory for demo purposes - in production, store it in a secure
    // persistent data store along with the Payment metadata, such as userId.
    PAYMENT_ID = paymentId;

    const configs = {
      client_name: 'Plaid Quickstart',
      user: {
        // This should correspond to a unique id for the current user.
        // Typically, this will be a user ID number from your application.
        // Personally identifiable information, such as an email address or phone number, should not be used here.
        client_user_id: Date.now(), //uuidv4(),
      },
      // Institutions from all listed countries will be shown.
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      // The 'payment_initiation' product has to be the only element in the 'products' list.
      products: [Products.PaymentInitiation],
      payment_initiation: {
        payment_id: paymentId,
      },
    };
    if (PLAID_REDIRECT_URI !== '') {
      configs.redirect_uri = PLAID_REDIRECT_URI;
    }
    const createTokenResponse = await client.linkTokenCreate(configs);
    return createTokenResponse.data;
  });
}

const authorizeAndCreateTransfer = async (accessToken) => {
  // We call /accounts/get to obtain first account_id - in production,
  // account_id's should be persisted in a data store and retrieved
  // from there.
  const accountsResponse = await client.accountsGet({
    access_token: accessToken,
  });
  const accountId = accountsResponse.data.accounts[0].account_id;

  const transferAuthorizationResponse =
    await client.transferAuthorizationCreate({
      access_token: accessToken,
      account_id: accountId,
      type: 'credit',
      network: 'ach',
      amount: '1.34',
      ach_class: 'ppd',
      user: {
        legal_name: 'FirstName LastName',
        email_address: 'foobar@email.com',
        address: {
          street: '123 Main St.',
          city: 'San Francisco',
          region: 'CA',
          postal_code: '94053',
          country: 'US',
        },
      },
    });
  const authorizationId = transferAuthorizationResponse.data.authorization.id;

  const transferResponse = await client.transferCreate({
    idempotency_key: '1223abc456xyz7890001',
    access_token: accessToken,
    account_id: accountId,
    authorization_id: authorizationId,
    type: 'credit',
    network: 'ach',
    amount: '12.34',
    description: 'Payment',
    ach_class: 'ppd',
    user: {
      legal_name: 'FirstName LastName',
      email_address: 'foobar@email.com',
      address: {
        street: '123 Main St.',
        city: 'San Francisco',
        region: 'CA',
        postal_code: '94053',
        country: 'US',
      },
    },
  });
  return transferResponse.data.transfer.id;
};
