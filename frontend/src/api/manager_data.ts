import { gql, useQuery } from '@apollo/client';

export const getManagerData = gql`
    query ManagerDataQuery {
        manager_data {
            id
            message
        }
    }
`;

export const useManagerData = () => useQuery(getManagerData);
