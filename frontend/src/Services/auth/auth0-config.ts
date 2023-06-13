export const AUTH_CONFIG = {
    domain: import.meta.env.VITE_APP_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_APP_AUTH0_CLIENT_ID,
    redirectUri: window.location.origin, //import.meta.url,
    afterLogout: import.meta.url,
    audience: import.meta.env.VITE_APP_AUTH0_AUDIENCE,
    scope: import.meta.env.VITE_APP_AUTH0_SCOPE,
};

export const hasAuth = !!AUTH_CONFIG.clientId;
