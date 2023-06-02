import type { FC, PropsWithChildren } from 'react';

import { AUTH_CONFIG } from './auth0-config';

import { Auth0Provider } from '@auth0/auth0-react';

export const hasAuth = !!AUTH_CONFIG.clientId;

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
    return hasAuth ? (
        <Auth0Provider
            clientId={AUTH_CONFIG.clientId}
            domain={AUTH_CONFIG.domain}
            authorizationParams={{
                redirect_uri: AUTH_CONFIG.redirectUri,
                audience: AUTH_CONFIG.audience,
                scope: AUTH_CONFIG.scope,
            }}
        >
            {children}
        </Auth0Provider>
    ) : (
        <>{children}</>
    );
};
