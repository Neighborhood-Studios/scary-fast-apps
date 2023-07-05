# FE overview #

It is a React app template. 

[pnpm](https://pnpm.io) has been chosen as a package manager, <br/>
bundler and dev environment is [vitejs](https://vitejs.dev).

Services initially integrated to the app: 
 - [Auth0](https://auth0.com) -- authentication service
 - [Hasura](https://hasura.io) with [Apollo GQL](https://www.apollographql.com) -- backend endpoint
 - [Heap](https://developers.heap.io) -- analytics service 
 - [Stripe](https://stripe.com) -- payment processor
 - [Plaid](https://plaid.com) -- payments and banking service

for these services you need to set some environment variables. see **.env** for reference

**Note:** *do not commit security sensitive variables, for local development use **env.local** file instead*


### Auth0 ###
to use Auth0 you need create account in the service and set some Auth0 environment variables:
`VITE_APP_AUTH0_DOMAIN`, `VITE_APP_AUTH0_CLIENT_ID`, `VITE_APP_AUTH0_CALLBACK_URL`

### Hasura ###
to use Hasura create Hasura account, get hasura endpoint from [hasura dashboard](https://cloud.hasura.io/projects) and set it to `VITE_APP_HASURA_HTTP_URI` (`VITE_APP_HASURA_WS_URL` for websockets) 

### Heap ###
get heap application ID from [heap dashboard](https://heapanalytics.com/app) and set to `VITE_APP_HEAP_ID`

### Stripe ###
create Stripe account, get `Publishable key` from [stripe dashboard](https://dashboard.stripe.com/dashboard) and set to `PUBLISHABLE_KEY` variable. 

Stripe requires a special backend to communicate with stripe platform and make transactions.
Set backend url to `VITE_APP_STRIPE_BE_URL`.

Also, there is a Stripe backend imitation for local development:
set Stripe Secret Key to `VITE_APP_STRIPE_SECRET_KEY` in **.env.development.local** file

### Plaid ###
Plaid requires backend server as well. Set plaid backend url to `VITE_APP_PLAID_BE_URL`.

Also, there is a Plaid backend imitation for local development. 
Set Plaid Client Id and Secret Key to `VITE_APP_PLAID_CLIENT_ID` and `VITE_APP_PLAID_SECRET` in **.env.development.local** file

### Auth0 integration with Hasura ###
First you need to have Auth0 application, then create an Auth0 API. as an Identifier you can use Hasura graphql endpoint.
And also set Identifier value to `VITE_APP_AUTH0_AUDIENCE` environment variable.
#### Custom JWT Claims ####
The custom JWT claims are needed because they tell Hasura about the role of the user making the API call. This way, Hasura can enforce the appropriate authorization rules. The rules define what the user is allowed to do.<br>
Go to Auth0 -> Actions -> Flows and create custom action for Login flow.
You can name it _'hasura-jwt-claims'_ and update `onExecutePostLogin` function:
```js
exports.onExecutePostLogin = async (event, api) => {
   const namespace = "https://hasura.io/jwt/claims";

  if (event.authorization) {
    const allowedRoles = event.authorization.roles?.length ? event.authorization.roles : ['user'];
    api.accessToken.setCustomClaim(namespace, {
      'x-hasura-default-role': allowedRoles[0],
      'x-hasura-allowed-roles': allowedRoles,
      'x-hasura-user-id': event.user.user_id
    });
  }
};
```
#### Sync Users Between Auth0 and Hasura ####
You need to ensure that the users from your database are in sync with Auth0. As a result, you will create another rule to keep the two in sync!
Create a custom action for Login flow _"hasura sync users"_:
```js
const axios = require('axios');
exports.onExecutePostLogin = async (event, api) => {
  const userId = event.user.user_id;
  const userName = event.user.name;
  const {client_id} = event.client;

  let admin_secret = null, url = null;
  //
  if(client_id === event.secrets.dev_client_Id) {
    admin_secret = event.secrets.dev_gql_admin_secret;
    url = event.secrets.dev_gql_endpoint;
  } else if(client_id === event.secrets.staging_client_Id) {
    admin_secret = event.secrets.staging_gql_admin_secret;
    url = event.secrets.staging_gql_endpoint;
  }

  const query = `mutation($userId: String!, $userName: String) {
    insert_users_user(objects: [{
      auth0id: $userId, name: $userName, last_seen: "now()"
    }], on_conflict: {constraint: users_user_pkey, update_columns: [last_seen, name]}
    ) {
      affected_rows
    }
  }`;

  const variables = { userId, userName };

  if(admin_secret && client_id) axios.post(url, {
    query: query,
    variables: variables
  }, {
    headers: {
      'content-type' : 'application/json',
      'x-hasura-admin-secret': admin_secret
    },
  })};
```
add to script secrets:
- `dev_gql_admin_secret` and `staging_gql_admin_secret` -- admin secrets from Hasura
- `dev_client_Id` and `staging_client_Id` -- Auth0 applications Client IDs related to development and staging instances 
- `dev_gql_endpoint` and `staging_gql_endpoint` -- Hasura graphql endpoints for dev and staging

#### Connect Hasura with Auth0 ####
Here you need to configure the public keys for Auth0. One way to generate the JWT config is to use the Hasura [JWT configurator](https://hasura.io/jwt-config/).
Choose the provider (Auth0) and then enter your "Auth0 Domain Name".
After that, press the button "Generate Config" to get your JWT Config.
Then you need to create an environment variable `HASURA_GRAPHQL_JWT_SECRET` at Hasura and set there generated JWT Config.

Use [Auth0 Hasura integration](https://hasura.io/learn/graphql/hasura-authentication/integrations/auth0/) for reference. 


## Deployment ##
Frontend react application can be automatically deployed to the Staging and Development instances.
See .github/workflows/frontend-deploy-*.yml files.
For that you need to have configured Amazon S3 buckets for staging and dev.
In the gihub actions set secrets `AWS_ACCESS_KEY_ID`, `AWS_ACCOUNT_ID`, `AWS_SECRET_ACCESS_KEY`
ant set variables 
- `DEV_S3_DEPLOY_TARGET` and `STAGING_S3_DEPLOY_TARGET` -- S3 buckets for dev and staging instances respectively
- `DEV_HASURA_GQL` and `STAGING_HASURA_GQL` -- Hasura graphql endpoints
- `DEV_AUTH0_DOMAIN` and `STAGING_AUTH0_DOMAIN` -- Auth0 domain for dev and staging.
- `DEV_AUTH0_CLIENT_ID` and `STAGING_AUTH0_CLIENT_ID` -- Auth0 application Client ID for dev and staging.
- `DEV_AUTH0_AUDIENCE` and `STAGING_AUTH0_AUDIENCE` -- Auth0 API Identifiers for dev and staging.

Frontend app will be automatically deployed from "staging" and "dev" branches. 
Also, it is possible to deploy to dev manually from any branch. 