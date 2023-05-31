import { HttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';

export function splitLink(token?: string, getToken?: () => Promise<string>) {
  return split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    getWsLink(token),
    getHttpLink(token, getToken)
  );
}

const getWsLink = (authToken?: string) =>
  new GraphQLWsLink(
    createClient({
      url: import.meta.env.VITE_APP_HASURA_WS_URL, //'ws://localhost:4000/subscriptions',
      connectionParams: authToken
        ? {
            authToken: authToken,
          }
        : undefined,
    })
  );
const httpLink = new HttpLink({
  uri: import.meta.env.VITE_APP_HASURA_HTTP_URI, //'http://localhost:4000/graphql'
});
const getHttpLink = (authToken?: string, getToken?: () => Promise<string>) => {
  if (authToken || getToken)
    return setContext(async (_, { headers }) => {
      const token = getToken ? await getToken() : authToken;
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : '',
        },
      };
    }).concat(httpLink);
  else return httpLink;
};
