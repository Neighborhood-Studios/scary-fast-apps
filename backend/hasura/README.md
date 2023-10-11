# Hasura configuration

### Prerequisites
1. install packages: run `npm i`
2. create file `.env.local` and override there `HASURA_GRAPHQL_ENDPOINT` and `HASURA_GRAPHQL_ADMIN_SECRET`.<br>
   (`.env.local` is in .gitignore so this file will not be committed, use it for security sensitive variables)


ref doc:
- [Hasura CLI Tool](https://hasura.io/docs/latest/hasura-cli/overview)
- [Hasura CLI metadata](https://hasura.io/docs/latest/hasura-cli/commands/hasura_metadata)
- [Hasura CLI Configuration Reference](https://hasura.io/docs/latest/hasura-cli/config-reference)

### Exporting
Export Hasura GraphQL Engine Metadata from the database. <br>
Export Hasura Metadata and save it in the /metadata directory. The output is a collection of yaml files which captures
all the Metadata required by the GraphQL Engine. This includes info about tables that are tracked, permission rules, 
relationships, and event triggers that are defined on those tables. <br>
ref: [Hasura CLI: hasura metadata export](https://hasura.io/docs/latest/hasura-cli/commands/hasura_metadata_export)

`npm run export` <br>
or <br>
`hasura metadata export --endpoint <Hasura endpoint URL> --admin-secret <Hasura admin secret> --project 'data'`


### Diff
(PREVIEW) Show a highlighted diff of the Hasura Metadata. <br>
(PREVIEW) This command shows changes between two different sets of Hasura Metadata. By default, it shows changes between 
the exported Hasura Metadata and the Hasura Metadata on the server. <br>
ref: [Hasura CLI: hasura metadata diff](https://hasura.io/docs/latest/hasura-cli/commands/hasura_metadata_diff)

`npm run diff`


### Deploying
Apply Hasura Metadata on a database. <br>
This command applies the Hasura GraphQL Engine Metadata saved in the database. You can use it to apply Hasura Metadata 
from one HGE server instance to another, such as when moving between development environments. <br>
ref: [Hasura CLI: hasura metadata apply](https://hasura.io/docs/latest/hasura-cli/commands/hasura_metadata_apply)

`npm run deploy` <br>
or <br>
`hasura metadata apply --endpoint <Hasura endpoint URL> --admin-secret <Hasura admin secret> --project 'data'`


### Update CLI
Update the CLI to latest or a specific version. <br>
You can use this command to update the CLI to the latest version or a specific version. Each time you run a CLI command, 
if a new version is available, you will be prompted to update the CLI. <br>
run `npx hasura update-cli --project 'data'` to update hasura cli binaries manually. <br>
ref: [Hasura CLI: hasura update-cli](https://hasura.io/docs/latest/hasura-cli/commands/hasura_update-cli/)
