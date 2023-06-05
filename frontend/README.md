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
