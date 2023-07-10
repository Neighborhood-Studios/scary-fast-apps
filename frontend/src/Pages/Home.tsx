import type { FC } from 'react';
import { Link } from 'react-router-dom';
//
import { plaidEnabled, stripeEnabled } from 'app-constants.ts';
import { ROUTES } from 'routes.tsx';

type HomeProps = object;
export const Home: FC<HomeProps> = () => {
    return (
        <section>
            <h4>Hello World</h4>
            <nav>
                <ul>
                    {stripeEnabled && (
                        <li>
                            <Link to={ROUTES.STRIPE}>stripe example</Link>
                        </li>
                    )}
                    {plaidEnabled && (
                        <li>
                            <Link to={ROUTES.PLAID}>plaid example</Link>
                        </li>
                    )}
                    <li>
                        <Link to={ROUTES.ADMIN}>
                            Admin section (manager only)
                        </Link>
                    </li>
                </ul>
            </nav>
        </section>
    );
};
