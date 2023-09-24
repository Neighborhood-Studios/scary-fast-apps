# Auth0 configuration

### Prerequisites
For initial setup follow the following guide: https://auth0.com/docs/deploy-monitor/deploy-cli-tool

1. Install the deploy tool: `npm install -g auth0-deploy-cli`
2. Set CLIENT SECRET env: `export AUTH0_CLIENT_SECRET=<Deploy CLI app client secret>`


### Exporting

`a0deploy export --strip --format yaml --output_folder local --config_file ./config/dev.json`

Note: all secret variables are mot exported and will need to be configured manually or to be added as ENV replacement vars https://community.auth0.com/t/auth0-cli-and-action-secrets/88103/3


### Importing

`a0deploy import --input_file local/tenant.yaml --config_file ./config/dev.json`
