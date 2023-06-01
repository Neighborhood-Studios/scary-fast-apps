import type { FC, PropsWithChildren } from 'react';

import { useEffect, useMemo, useState } from 'react';
//
import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';

import { splitLink } from './utils.ts';

const createApolloClient = (
  authToken?: string,
  getAuthToken?: () => Promise<string>
) =>
  new ApolloClient({
    link: splitLink(authToken, getAuthToken),
    cache: new InMemoryCache(),
  });

export const ApolloClientProvider: FC<
  PropsWithChildren<{ hasAuth: boolean }>
> = ({ hasAuth, children }) => {
  return hasAuth ? (
    <ApolloClientWithAuthProvider>{children}</ApolloClientWithAuthProvider>
  ) : (
    <ApolloClientNoAuthProvider>{children}</ApolloClientNoAuthProvider>
  );
};

const ApolloClientWithAuthProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const [authToken, setAuthToken] = useState<string>('');
  const { getAccessTokenSilently } = useAuth0();
  const client = useMemo(
    () => createApolloClient(authToken, getAccessTokenSilently),
    [authToken, getAccessTokenSilently]
  );

  useEffect(() => {
    getAccessTokenSilently().then(setAuthToken);
  }, [getAccessTokenSilently]);

  useEffect(
    () => () => {
      client.resetStore();
    },
    [client]
  );

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

const ApolloClientNoAuthProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const client = useMemo(() => createApolloClient(), []);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
