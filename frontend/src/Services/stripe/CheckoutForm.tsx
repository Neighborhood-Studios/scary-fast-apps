import type { FC } from 'react';

import { FormEventHandler, useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  LinkAuthenticationElement,
} from '@stripe/react-stripe-js';

const CheckoutForm: FC<{ return_url: string }> = ({ return_url }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        return_url: return_url,
      },
    });

    // This point will only be reached if there is an immediate error when
    // confirming the payment. Otherwise, your customer will be redirected to
    // your `return_url`. For some payment methods like iDEAL, your customer will
    // be redirected to an intermediate site first to authorize the payment, then
    // redirected to the `return_url`.
    if (error.type === 'card_error' || error.type === 'validation_error') {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('An unexpected error occurred.');
    }
    setSubmitting(false);
  };

  const submitIsDisabled = !stripe || !elements || submitting;
  return (
    <form onSubmit={handleSubmit}>
      <LinkAuthenticationElement id="link-authentication-element" />
      <PaymentElement />
      <div>
        <button disabled={submitIsDisabled}>Submit</button>
      </div>
      {/* Show error message to your customers */}
      {errorMessage && <em>{errorMessage}</em>}
    </form>
  );
};

export default CheckoutForm;
