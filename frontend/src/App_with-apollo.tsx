import type { FC } from 'react';

import { gql, useQuery } from '@apollo/client';

const GET_USERS = gql`
    query GetUsers {
        users {
            is_online
            id
            email
            name
            password
            created_at
            updated_at
        }
    }
`;

type AppProps = object;
export const App: FC<AppProps> = () => {
    const { loading, error, data } = useQuery(GET_USERS);

    if (loading) return <>Loading...</>;
    if (error) return <>{`Error! ${error.message}`}</>;

    return (
        <main>
            <pre>{JSON.stringify(data, null, '  ')}</pre>{' '}
        </main>
    );
};

export default App;
