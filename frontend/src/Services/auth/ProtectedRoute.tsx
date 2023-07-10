import type { FC, ComponentType } from 'react';
import type { WithAuthenticationRequiredOptions } from '@auth0/auth0-react';

import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

import { ROUTES } from 'routes.tsx';
import { getUserRoles } from './utils.ts';

export const ProtectedRoute: FC<{
    component: ComponentType;
    authOptions?: WithAuthenticationRequiredOptions;
    roles?: string[];
}> = ({ component, authOptions, roles, ...props }) => {
    const Component = withAuthenticationRequired(component, authOptions);
    const { user } = useAuth0();

    const hasAccess =
        roles == null ||
        getUserRoles(user).some((role) => roles.includes(role));

    return hasAccess ? (
        <Component {...props} />
    ) : (
        <Navigate to={ROUTES.ROOT} replace />
    );
};
