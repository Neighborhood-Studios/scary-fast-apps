import { gql, useQuery } from '@apollo/client';

const getUser = gql`
    query GetUsers {
        users_user {
            auth0id
            name
            last_seen
        }
    }
`;

export const useUser = () => useQuery(getUser);
