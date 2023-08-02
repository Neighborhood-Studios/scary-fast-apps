# Database
### Creating new database:

```
-- everything is executed as super admin 'postgres'

CREATE USER sfa_dev WITH ENCRYPTED PASSWORD 'django_pass!!!';

CREATE DATABASE sfa_dev;

-- connect to new database
\c sfa_dev;

CREATE EXTENSION pgcrypto;  -- should be already enabled on AWS

GRANT ALL ON DATABASE sfa_dev TO sfa_dev;

CREATE USER sfa_dev_hasura WITH ENCRYPTED PASSWORD 'hasura_pass!!!';

-- grants schema creation rights too, neccessary for metadata storage
GRANT ALL ON DATABASE sfa_dev TO sfa_dev_hasura;

-- prevent hasura (or anyone) from creating new tables in public schema
REVOKE CREATE ON schema public FROM public;

-- allow hasura to select from public schema
GRANT USAGE ON schema public TO sfa_dev_hasura;

-- allow django to create new tables in public schema
GRANT CREATE ON schema public TO sfa_dev;
GRANT USAGE ON schema public TO sfa_dev;

-- allow hasura to select data on any existing objects
GRANT ALL ON ALL TABLES IN SCHEMA public TO sfa_dev_hasura;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sfa_dev_hasura;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO sfa_dev_hasura;

-- alter default permissions when new objects are created
GRANT sfa_dev TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE sfa_dev IN SCHEMA public GRANT ALL ON TABLES TO sfa_dev_hasura;
ALTER DEFAULT PRIVILEGES FOR ROLE sfa_dev IN SCHEMA public GRANT ALL ON SEQUENCES TO sfa_dev_hasura;
ALTER DEFAULT PRIVILEGES FOR ROLE sfa_dev IN SCHEMA public GRANT ALL ON FUNCTIONS TO sfa_dev_hasura;
ALTER DEFAULT PRIVILEGES FOR ROLE sfa_dev IN SCHEMA public GRANT ALL ON TYPES TO sfa_dev_hasura;
ALTER DEFAULT PRIVILEGES FOR ROLE sfa_dev GRANT USAGE ON SCHEMAS TO sfa_dev_hasura;
REVOKE sfa_dev FROM postgres;

-- now when table\function is created BY sfa_dev it will automatically have pemissions for sfa_dev_hasura role too
-- default permissions should look like this after the above commands
sfa_dev=> \ddp
                  Default access privileges
  Owner  | Schema |   Type   |       Access privileges
---------+--------+----------+--------------------------------
 sfa_dev | public | function | sfa_dev_hasura=X/sfa_dev
 sfa_dev | public | sequence | sfa_dev_hasura=rwU/sfa_dev
 sfa_dev | public | table    | sfa_dev_hasura=arwdDxt/sfa_dev
 sfa_dev | public | type     | sfa_dev_hasura=U/sfa_dev
 sfa_dev |        | schema   | sfa_dev=UC/sfa_dev            +
         |        |          | sfa_dev_hasura=U/sfa_dev
(5 rows)

```

Overall goal is to allow hasura to select \ update \ use data and prevent it from modifying DDL of public schema. 
We do this by __owning__ the database\tables with the django user (sfa_dev) and manually assigning select\update\usage 
to the restricted hasura user (sfa_dev_hasura).

In Postgres only the object owner is allowed to modify the said object.

This only prevents DDL modifications on 'public' schema, hasura user can still create new schemas that are not restricted and not managed by django user. 


# Storage

### Overview
See https://nhost.io/blog/upload-files-with-hasura-and-hasura-storage

### FE configuration example

```typescript jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { HasuraStorageClient } from '@nhost/hasura-storage-js';
import { useAuth } from '@clerk/clerk-react';
import { env } from '~/env.mjs';

interface HasuraStorageContextProps {
  client: HasuraStorageClient | null;
}

const HasuraStorageContext = createContext<HasuraStorageContextProps>({
  client: null,
});

export const HasuraStorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken } = useAuth();

  const [hasuraStorageClient, setHasuraStorageClient] = useState<HasuraStorageClient | null>(null);

  useEffect(() => {
    async function initHasuraStorageClient() {
      const token = await getToken({ template: "hasura" });
      if (token) {
        const client = new HasuraStorageClient({
          url: env.PUBLIC_HASURA_STORAGE_ENDPOINT
        });
        client.setAccessToken(token);
        setHasuraStorageClient(client);
      }
    }
    initHasuraStorageClient();
  }, [getToken]);

  return (
    <HasuraStorageContext.Provider value={{ client: hasuraStorageClient }}>
      {children}
    </HasuraStorageContext.Provider>
  );
};

export const useHasuraStorageClient = (): HasuraStorageClient | null => {
  const { client: hasuraStorageClient } = useContext(HasuraStorageContext);
  return hasuraStorageClient;
};

// And
    <ClerkProvider {...pageProps} navigate={(to) => push(to)}>
      <HasuraStorageProvider>
        <UrqlProviderWrapper>
          {getLayout(<Component {...pageProps} />)}
        </UrqlProviderWrapper>
      </HasuraStorageProvider>
    </ClerkProvider>
```
