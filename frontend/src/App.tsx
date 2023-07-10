import type { FC } from 'react';
//
import { Link, useRoutes } from 'react-router-dom';
//
import { hasAuth, LoginButton } from './Services/auth';
import { ROUTES, routes } from './routes.tsx';

type AppProps = object;
export const App: FC<AppProps> = () => {
    const routesElement = useRoutes(routes);
    return (
        <main>
            <div>
                <Link to={ROUTES.ROOT}>App</Link>
            </div>
            {routesElement}
            {hasAuth && (
                <>
                    <hr />
                    <LoginButton />
                </>
            )}
        </main>
    );
};
