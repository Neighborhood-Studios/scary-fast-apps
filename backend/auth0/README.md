# Auth0 configuration

### Prerequisites

1. install packages: run `npm i`
2. create file `.env.local` and override there `AUTH0_CLIENT_SECRET` (from 'Management API Service' application) and any
   other environment variables.<br>
   (`.env.local` is in .gitignore so this file will not be committed, use it for security sensitive variables)

by default run script will use development configuration. Set environment variable ENV to "development", "staging" or "
production" to use different configurations
(handy in CI)

ref doc:

- [Auth0 Deploy CLI Tool](https://auth0.com/docs/deploy-monitor/deploy-cli-tool)
- [Incorporate into Multi-environment Workflows](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/incorporating-into-multi-environment-workflows)
- [Keyword Replacement](https://auth0.com/docs/deploy-monitor/deploy-cli-tool/keyword-replacement)

### Exporting

`npm run export`
or
`AUTH0_CLIENT_SECRET=<Deploy CLI app client secret> a0deploy export --strip --format yaml --output_folder local --config_file ./config/config-development.json.json`

Note: all secret variables are not exported and will need to be configured manually or to be added as ENV replacement
vars https://community.auth0.com/t/auth0-cli-and-action-secrets/88103/3

### Deploying

`npm run deploy`
or
`AUTH0_CLIENT_SECRET=<Deploy CLI app client secret> a0deploy import --input_file local/tenant.yaml --config_file ./config/config-development.json`

Note: after deploy do not forget to manually update actions secret values
