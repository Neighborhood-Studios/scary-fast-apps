import type { FC } from "react";
import type { StripeElementsOptions } from "@stripe/stripe-js";
//
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import { apiKey } from "./stripe-config.ts";
import CheckoutForm from "./CheckoutForm.tsx";

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(apiKey);

export const Stripe: FC<{
    paymentIntentSecretKey: string;
    onSuccess(): void;
}> = ({ paymentIntentSecretKey, onSuccess }) => {
    const [message, setMessage] = useState<string>();

    const params = new URLSearchParams(location.search);
    // const paymentIntentId = params.get('payment_intent');
    const redirect_paymentIntentSecret = params.get(
        'payment_intent_client_secret'
    );
    const redirect_paymentIntentStatus = params.get('redirect_status');

    const [paymentStatus, setPaymentStatus] = useState(
        redirect_paymentIntentStatus
    );

    useEffect(() => {
        switch (paymentStatus) {
            case null:
            case undefined:
                break;
            case 'succeeded':
                setMessage('Payment succeeded!');
                onSuccess();
                break;
            case 'processing':
                setMessage('Your payment is processing.');
                break;
            case 'requires_payment_method':
                if (redirect_paymentIntentStatus)
                    setMessage(
                        'Your payment was not successful, please try again.'
                    );
                break;
            default:
                setMessage('Something went wrong.');
                break;
        }
    }, [redirect_paymentIntentStatus, paymentStatus, onSuccess]);

    const clientSecret =
        paymentIntentSecretKey || redirect_paymentIntentSecret || '';
    useEffect(() => {
        if (clientSecret) {
            stripePromise
                .then((stripe) => stripe?.retrievePaymentIntent(clientSecret))
                .then((paymentIntentResult) => {
                    console.log('retrievePaymentIntent:', paymentIntentResult);
                    if (
                        paymentIntentResult &&
                        paymentIntentResult.paymentIntent
                    ) {
                        setPaymentStatus(
                            paymentIntentResult.paymentIntent.status
                        );
                    } else if (
                        paymentIntentResult &&
                        paymentIntentResult.error
                    ) {
                        setMessage(paymentIntentResult.error.message);
                    }
                });
        }
    }, [clientSecret]);

    const options: StripeElementsOptions = {
        // passing the client secret obtained from the server
        clientSecret:
            paymentIntentSecretKey || redirect_paymentIntentSecret || '',
        appearance: {
            theme: 'stripe',
        },
    };

    return (
        <>
            <div className="text-yellow-700">{message}</div>
            <Elements stripe={stripePromise} options={options}>
                <CheckoutForm return_url={window.location.href} />
            </Elements>
        </>
    );
};
