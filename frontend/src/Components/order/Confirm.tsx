import type { FC, FormEventHandler } from 'react';
import type { PaymentIntent } from '@stripe/stripe-js';

import { useOutletContext } from 'react-router-dom';

type ConfirmProps = object;
export const Confirm: FC<ConfirmProps> = () => {
    const { goToPayment, orderInfo } = useOutletContext<OrderContext>();

    const submit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        // const orderIdEl = formEl.elements.namedItem('order_id') as HTMLInputElement;
        const amountEl = formEl.elements.namedItem(
            'amount'
        ) as HTMLInputElement;
        const currencyEl = formEl.elements.namedItem(
            'currency'
        ) as HTMLSelectElement;

        fetch(import.meta.env.VITE_APP_STRIPE_BE_URL, {
            method: 'POST',
            body: JSON.stringify({
                amount: amountEl.value,
                currency: currencyEl.value,
            }),
        })
            .then((res) => res.json())
            .then((paymentIntent: PaymentIntent) => {
                goToPayment({
                    orderId: orderInfo.id,
                    paymentIntent,
                });
            });
    };

    return (
        <form onSubmit={submit}>
            <h4>Order</h4>
            <div>
                <label>
                    Order ID
                    <input
                        type="text"
                        name="order_id"
                        placeholder="0"
                        defaultValue={orderInfo.id}
                        readOnly
                    />
                </label>
            </div>
            <div>
                <label>
                    Order amount
                    <input
                        type="text"
                        name="amount"
                        placeholder="0.00"
                        defaultValue={orderInfo.amount}
                    />
                </label>
            </div>
            <div>
                <label>
                    Order currency
                    <select name="currency">
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </select>
                </label>
            </div>
            <button type="submit">Confirm</button>
        </form>
    );
};
