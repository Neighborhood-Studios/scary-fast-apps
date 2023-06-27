import type { FC } from 'react';
import { Navigate } from 'react-router-dom';

import { plaidEnabled } from 'app-constants.ts';
import { ROUTES } from 'routes.tsx';

import Plaid from 'Services/plaid';

type PlaidComponentProps = object;
export const PlaidComponent: FC<PlaidComponentProps> = () => {
    return plaidEnabled ? <Plaid /> : <Navigate to={ROUTES.ROOT} />;
};
