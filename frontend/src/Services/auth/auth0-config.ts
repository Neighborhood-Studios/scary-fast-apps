export const AUTH_CONFIG = {
  domain: import.meta.env.VITE_APP_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_APP_AUTH0_CLIENT_ID,
  callbackUrl: new URL('/callback', import.meta.url),
  redirectUri: import.meta.url,
  afterLogout: import.meta.url,
  audience: import.meta.env.VITE_APP_AUTH0_AUDIENCE,
  scope: import.meta.env.VITE_APP_AUTH0_SCOPE,
};
