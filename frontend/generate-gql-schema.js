#!/usr/bin/env node

import { execSync } from 'child_process';

execSync(
    `pnpm gq ${process.env.VITE_APP_HASURA_HTTP_URI} -H "X-Hasura-Admin-Secret: ${process.env.HASURA_ADMIN_SECRET}" --introspect  > schema.graphql`
);
