import type { FC } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

type UserProfileProps = object;
export const UserProfile: FC<UserProfileProps> = () => {
    const user = useAuth0();
    return (
        <pre>
            USER:
            {JSON.stringify(user, null, '  ')}
        </pre>
    );
};
