import type { FC } from 'react';
//
import { Link, useMatch, useRoutes } from 'react-router-dom';
//
import { hasAuth, LoginButton } from './Services/auth';
import { ROUTES, routes } from './routes.tsx';

type AppProps = object;
export const App: FC<AppProps> = () => {
    const routesElement = useRoutes(routes);
    const isAdminDashboard = useMatch({ path: ROUTES.ADMIN, end: false });

    return isAdminDashboard ? (
        routesElement
    ) : (
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
