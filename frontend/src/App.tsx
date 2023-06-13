import type { FC } from 'react';
//
import { useRoutes } from 'react-router-dom';
//
import { hasAuth, LoginButton } from './Services/auth';
import { routes } from './routes.tsx';

type AppProps = object;
export const App: FC<AppProps> = () => {
    const routesElement = useRoutes(routes);
    return (
        <main>
            <div>App</div>
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
