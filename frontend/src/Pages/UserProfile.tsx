import type { FC } from 'react';
//
import { useAuth0 } from '@auth0/auth0-react';
//
import { useUser } from 'api/user';

type UserProfileProps = object;
export const UserProfile: FC<UserProfileProps> = () => {
    const user = useAuth0();
    const { loading, data, error } = useUser();
    return (
        <>
            <pre>
                Auth0 USER:
                {JSON.stringify(user, null, '  ')}
            </pre>
            <pre>
                Hasura over apollo:
                {JSON.stringify({ loading, data, error }, null, '  ')}
            </pre>
        </>
    );
};
