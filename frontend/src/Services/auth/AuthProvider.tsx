import type { FC, PropsWithChildren } from 'react';
import type { AppState, Auth0ProviderOptions } from '@auth0/auth0-react';
//
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
//
import { AUTH_CONFIG, hasAuth } from './auth0-config';

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
    return hasAuth ? (
        <Auth0ProviderWithRedirectCallback
            clientId={AUTH_CONFIG.clientId}
            domain={AUTH_CONFIG.domain}
            authorizationParams={{
                redirect_uri: AUTH_CONFIG.redirectUri,
                audience: AUTH_CONFIG.audience,
                scope: AUTH_CONFIG.scope,
            }}
        >
            {children}
        </Auth0ProviderWithRedirectCallback>
    ) : (
        <>{children}</>
    );
};

const Auth0ProviderWithRedirectCallback: FC<
    PropsWithChildren<Auth0ProviderOptions>
> = ({ children, ...props }) => {
    const navigate = useNavigate();
    const onRedirectCallback = (appState?: AppState) => {
        navigate((appState && appState.returnTo) || window.location.pathname);
    };
    return (
        <Auth0Provider onRedirectCallback={onRedirectCallback} {...props}>
            {children}
        </Auth0Provider>
    );
};
