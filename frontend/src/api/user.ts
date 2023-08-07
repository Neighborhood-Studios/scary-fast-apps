import { gql, useQuery } from '@apollo/client';
import { useAuth0 } from '@auth0/auth0-react';

const getUser = gql`
    query GetUsers($auth0id: String!) {
        users_user_by_pk(auth0id: $auth0id) {
            auth0id
            name
            last_seen
        }
    }
`;

export const useUser = () => {
    const { user } = useAuth0();
    return useQuery(getUser, { variables: { auth0id: user?.sub } });
};
