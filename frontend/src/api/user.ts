import { gql, useQuery } from '@apollo/client';

const getUser = gql`
    query GetUsers {
        users {
            id
            name
            last_seen
            posts {
                id
                message
            }
        }
    }
`;

export const useUser = () => useQuery(getUser);
