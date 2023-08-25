const sentryConfig = {
    release: import.meta.env.PACKAGE_VERSION,
    environment: import.meta.env.VITE_APP_ENVIRONMENT,
    sentryDsn: import.meta.env.VITE_APP_SENTRY_DSN,
};

export default sentryConfig;
