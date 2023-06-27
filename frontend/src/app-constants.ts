import { apiKey } from './Services/stripe/stripe-config.ts';

export const stripeBeURL = import.meta.env.VITE_APP_STRIPE_BE_URL;
export const plaidBeURL = import.meta.env.VITE_APP_PLAID_BE_URL;

export const stripeEnabled = stripeBeURL && apiKey;
export const plaidEnabled = !!plaidBeURL;
