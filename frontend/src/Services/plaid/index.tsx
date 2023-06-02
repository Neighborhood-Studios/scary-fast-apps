import { PlaidContextProvider } from './context.tsx';
import { Plaid } from './Plaid.tsx';
import './plaid.scss';

export default () => (
    <PlaidContextProvider>
        <Plaid />
    </PlaidContextProvider>
);
