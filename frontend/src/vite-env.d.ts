/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
    readonly VITE_APP_HEAP_ID: string;
    readonly VITE_APP_AUTH0_DOMAIN: string;
    readonly VITE_APP_AUTH0_CLIENT_ID: string;
    readonly VITE_APP_AUTH0_CALLBACK_URL: string;

    readonly VITE_APP_AUTH0_AUDIENCE: string;
    readonly VITE_APP_AUTH0_SCOPE: string;

    readonly VITE_APP_HASURA_HTTP_URI: string;
    readonly VITE_APP_HASURA_WS_URL: string;

    readonly VITE_APP_STRIPE_PUBLISHABLE_KEY: string;
    readonly VITE_APP_STRIPE_BE_URL: string;

    readonly VITE_APP_PLAID_BE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
