import type { FC } from 'react';
import { useLocation } from 'react-router-dom';

type SuccessfulProps = object;
export const Successful: FC<SuccessfulProps> = () => {
    const location = useLocation();
    const orderInfo = location.state?.orderInfo;

    return orderInfo ? (
        <div>
            <h2>Payment Successful</h2>
            <p>Order #{orderInfo.id}</p>
            <p>amount {orderInfo.amount}</p>
        </div>
    ) : (
        <>no order</>
    );
};
