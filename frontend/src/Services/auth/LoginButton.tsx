import { useAuth0 } from '@auth0/auth0-react';
import { Link, useLocation } from 'react-router-dom';
//
import { getAbsoluteRouteURL, ROUTES } from 'routes.tsx';

export const LoginButton = () => {
    const { loginWithRedirect, logout, isAuthenticated, isLoading } =
        useAuth0();
    const location = useLocation();

    if (isLoading) return null;
    return (
        <>
            <div>
                <Link to={ROUTES.PROTECTED + '/profile'}>user profile</Link>
            </div>
            {isAuthenticated ? (
                <button
                    onClick={() =>
                        logout({
                            logoutParams: {
                                returnTo: getAbsoluteRouteURL(ROUTES.ROOT),
                            },
                        })
                    }
                >
                    Log out
                </button>
            ) : (
                <button
                    onClick={() =>
                        loginWithRedirect({
                            appState: { returnTo: location.pathname },
                        })
                    }
                >
                    Log In
                </button>
            )}
        </>
    );
};
