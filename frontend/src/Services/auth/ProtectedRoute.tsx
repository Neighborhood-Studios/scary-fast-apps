import type { FC, ComponentType } from 'react';

import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

import { ROUTES } from 'routes.tsx';
import { getUserRoles } from './utils.ts';

export const ProtectedRoute: FC<{
    Component: ComponentType;
    roles?: string[];
}> = withAuthenticationRequired(
    ({ Component, /*authOptions,*/ roles, ...props }) => {
        const { user } = useAuth0();
        if (!user) return null;

        const hasAccess =
            roles == null ||
            getUserRoles(user).some((role) => roles.includes(role));

        return hasAccess ? (
            <Component {...props} />
        ) : (
            <Navigate to={ROUTES.ROOT} replace />
        );
    }
);
