import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
//
import { ROUTES } from 'routes.tsx';

export const LoginButton = () => {
    const { loginWithRedirect, logout, isAuthenticated, isLoading } =
        useAuth0();

    if (isLoading) return null;
    return (
        <>
            <div>
                <Link to={ROUTES.PROTECTED + '/profile'}>user profile</Link>
            </div>
            {isAuthenticated ? (
                <button onClick={() => logout()}>Log out</button>
            ) : (
                <button onClick={() => loginWithRedirect()}>Log In</button>
            )}
        </>
    );
};