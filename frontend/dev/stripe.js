import { loadEnv } from 'vite';
import stripeAPI from 'stripe';

const env = loadEnv('development', process.cwd(), '');

//@ts-ignore
const stripe = stripeAPI(env.VITE_APP_STRIPE_SECRET_KEY);

export function getPaymentIntent(config) {
  return stripe.paymentIntents.create({
    amount: config.amount,
    currency: config.currency,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}
