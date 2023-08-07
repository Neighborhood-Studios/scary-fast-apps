import { Navigate, Outlet } from 'react-router-dom';
//
import { ProtectedRoute } from 'Services/auth/ProtectedRoute';
import { Home } from 'Pages/Home';
import { routes as orderRoutes, StripeOrder } from 'Pages/StripeOrder';
import { PlaidComponent } from 'Pages/PlaidComponent';
import { UserProfile } from 'Pages/UserProfile';
import { ManagerPage } from 'Pages/ManagerPage.tsx';
import { AdminPanel } from 'Pages/AdminPanel.tsx';
import { routes as adminRoutes } from 'Admin-panel/routes';
import { admitRoot } from './constants.ts';

export const baseURL = new URL(import.meta.env.BASE_URL, window.origin);
export const getAbsoluteRouteURL = (route: string) =>
    new URL(route.replace(/^\//, ''), baseURL.href.replace(/([^/])$/, '$1/'))
        .href;

export enum ROUTES {
    ROOT = '/',
    STRIPE = '/stripe',
    PLAID = '/plaid',
    PROTECTED = '/user',
    MANAGER = '/manager',
    ADMIN = admitRoot,
}

export const routes = [
    {
        path: ROUTES.ROOT,
        element: <Outlet />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: ROUTES.STRIPE,
                element: <StripeOrder />,
                children: orderRoutes,
            },
            {
                path: ROUTES.PLAID,
                element: <PlaidComponent />,
            },
            {
                path: ROUTES.MANAGER,
                element: <ManagerPage />,
            },
            {
                path: ROUTES.PROTECTED,
                element: (
                    <ProtectedRoute
                        Component={() => (
                            <>
                                <Outlet />
                                <Navigate to="profile" replace />
                            </>
                        )}
                    />
                ),
                children: [
                    {
                        path: 'profile',
                        element: <UserProfile />,
                    },
                ],
            },
            {
                path: ROUTES.ADMIN,
                element: (
                    <ProtectedRoute
                        roles={['manager']}
                        Component={AdminPanel}
                    />
                ),
                children: adminRoutes,
            },
        ],
        errorElement: <div>an error has occurred</div>,
    },
];
