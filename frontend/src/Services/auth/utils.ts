import type { User } from '@auth0/auth0-react';

import { AUTH_CONFIG } from './auth0-config.ts';

export function getUserRoles<Auth0User extends User>(
    user?: Auth0User
): string[] {
    return user?.[AUTH_CONFIG.domain].roles ?? [];
}
