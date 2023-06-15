import type { FC, PropsWithChildren } from 'react';
//
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

const ApolloClientWithAuthProvider: FC<PropsWithChildren> = ({ children }) => {
    const [authToken, setAuthToken] = useState<string>();
    const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();

    const client = useMemo(
        () =>
            createApolloClient(
                authToken,
                authToken ? getAccessTokenSilently : undefined
            ),
        [authToken, getAccessTokenSilently]
    );

    useEffect(() => {
        if (isAuthenticated) getAccessTokenSilently().then(setAuthToken);
    }, [isAuthenticated, getAccessTokenSilently]);

    useEffect(
        () => () => {
            client.resetStore();
        },
        [client]
    );

    return isLoading ? (
        <>Authenticating...</>
    ) : (
        <ApolloProvider client={client}>{children}</ApolloProvider>
    );
};

const ApolloClientNoAuthProvider: FC<PropsWithChildren> = ({ children }) => {
    const client = useMemo(() => createApolloClient(), []);
    return <ApolloProvider client={client}>{children}</ApolloProvider>;
};
