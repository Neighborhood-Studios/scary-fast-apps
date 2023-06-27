import type { FC } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

import { stripeEnabled } from 'app-constants.ts';
import { ROUTES } from 'routes.tsx';
import { Confirm } from 'Components/order/Confirm';
import { Payment } from 'Components/order/Payment';
import { Successful } from 'Components/order/Successful.tsx';

export enum paymentRoutes {
    PAYMENT = 'payment',
    SUCCESS = 'payment-successful',
}

export const routes: RouteObject[] = [
    {
        // path: paymentRoutes.CONFIRM,
        index: true,
        element: <Confirm />,
    },
    {
        path: paymentRoutes.PAYMENT,
        element: <Payment />,
    },
    {
        path: paymentRoutes.SUCCESS,
        element: <Successful />,
    },
];

export const StripeOrder: FC = () => {
    // const location = useHref(paymentRoutes.RESULT);
    const navigate = useNavigate();

    const orderInfo = {
        //sample info
        id: Date.now(),
        amount:
            String(new Date().getHours()) +
            String(new Date().getMinutes()).padStart(2, '0'),
        products: [{ id: 1, name: 'prod 1' }],
    };

    const goToPayment = (state: { paymentIntent: string }) => {
        navigate(paymentRoutes.PAYMENT, { state });
    };
    const goToSuccess = () => {
        navigate(paymentRoutes.SUCCESS, { state: { orderInfo } });
    };
    return stripeEnabled ? (
        <Outlet context={{ orderInfo, goToPayment, goToSuccess }} />
    ) : (
        <Navigate to={ROUTES.ROOT} />
    );
};
