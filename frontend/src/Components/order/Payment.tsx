import type { FC } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { Stripe } from 'Services/stripe';

type PaymentProps = object;
export const Payment: FC<PaymentProps> = () => {
    const location = useLocation();
    const { goToSuccess } = useOutletContext<OrderContext>();

    const paymentIntent = location.state?.paymentIntent;

    return (
        <div>
            <div>Payment</div>
            <div className="max-w-lg m-auto">
                <Stripe
                    paymentIntentSecretKey={paymentIntent?.client_secret}
                    onSuccess={() => {
                        console.log.bind(console, 'successful payment:');
                        goToSuccess();
                    }}
                />
            </div>
            <div className="mt-7">{testingInfo}</div>
        </div>
    );
};

const testingInfo = (
    <table className="m-auto">
        <caption>
            <h4>Dev Section</h4>
            <p>
                Use test payment details and the test redirect page to verify
                your integration. The following table contains some basic test
                scenarios. For detailed information about testing payments, see{' '}
                <a href="https://stripe.com/docs/testing">Testing</a>.
            </p>
        </caption>
        <thead>
            <tr>
                <th style={{ width: '118px' }}>Payment method</th>
                <th style={{ width: '299px' }}>Scenario</th>
                <th style={{ width: '408px' }}>How to test</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Credit card</td>
                <td>
                    The card payment succeeds and doesn’t require
                    authentication.
                </td>
                <td>
                    Fill out the credit card form using the credit card number{' '}
                    <code className="InlineCode">4242 4242 4242 4242</code> with
                    any expiration, CVC, and postal code.
                </td>
            </tr>
            <tr>
                <td>Credit card</td>
                <td>
                    The card payment requires{' '}
                    <span>
                        <span>
                            <a
                                title="Strong Customer Authentication"
                                className="UnstyledLink InlineLink Text-color--blue Glossary-term no-api-tag"
                                href="https://stripe.com/docs/strong-customer-authentication"
                            >
                                authentication
                            </a>
                        </span>
                    </span>
                    .
                </td>
                <td>
                    Fill out the credit card form using the credit card number{' '}
                    <code className="InlineCode">4000 0025 0000 3155</code> with
                    any expiration, CVC, and postal code.
                </td>
            </tr>
            <tr>
                <td>Credit card</td>
                <td>
                    The card is declined with a decline code like{' '}
                    <code className="InlineCode">insufficient_funds</code>.
                </td>
                <td>
                    Fill out the credit card form using the credit card number{' '}
                    <code className="InlineCode">4000 0000 0000 9995</code> with
                    any expiration, CVC, and postal code.
                </td>
            </tr>
            <tr>
                <td>Credit card</td>
                <td>
                    The UnionPay card has a variable length of 13-19 digits.
                </td>
                <td>
                    Fill out the credit card form using the credit card number{' '}
                    <code className="InlineCode">6205 500 0000 0000 0004</code>{' '}
                    with any expiration, CVC, and postal code.
                </td>
            </tr>
        </tbody>
    </table>
);
