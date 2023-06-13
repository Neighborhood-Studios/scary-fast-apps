import type { FC, ComponentType } from 'react';
import type { WithAuthenticationRequiredOptions } from '@auth0/auth0-react';

import { withAuthenticationRequired } from '@auth0/auth0-react';

export const ProtectedRoute: FC<{
    component: ComponentType;
    authOptions?: WithAuthenticationRequiredOptions;
}> = ({ component, authOptions, ...props }) => {
    const Component = withAuthenticationRequired(component, authOptions);
    return <Component {...props} />;
};
