import * as Sentry from '@sentry/react';
//
import sentryConfig from './sentryConfig.ts';
import { User } from '@auth0/auth0-react';

export function sentryInit() {
    Sentry.init({
        environment: sentryConfig.environment,
        dsn: sentryConfig.sentryDsn,
        release: sentryConfig.release,
        autoSessionTracking: false,

        // We recommend adjusting this value in production, or using tracesSampler
        // for finer control
        tracesSampleRate: 1.0,
    });
}
export function updateSentryUser(user: User) {
    Sentry.setUser(
        user && {
            id: user.sub,
            username: user.name,
            email: user.email,
        }
    );
}
