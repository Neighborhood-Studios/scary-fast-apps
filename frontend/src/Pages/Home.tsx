import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from 'routes.tsx';

type HomeProps = object;
export const Home: FC<HomeProps> = () => {
    return (
        <section>
            <h4>Hello World</h4>
            <nav>
                <ul>
                    <li>
                        <Link to={ROUTES.STRIPE}>stripe example</Link>
                    </li>
                    <li>
                        <Link to={ROUTES.PLAID}>plaid example</Link>
                    </li>
                </ul>
            </nav>
        </section>
    );
};
