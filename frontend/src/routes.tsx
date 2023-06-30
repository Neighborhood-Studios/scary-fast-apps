import { Navigate, Outlet } from 'react-router-dom';
//
import { ProtectedRoute } from 'Services/auth/ProtectedRoute';
import { Home } from 'Pages/Home';
import { routes as orderRoutes, StripeOrder } from 'Pages/StripeOrder';
import { PlaidComponent } from 'Pages/PlaidComponent';
import { UserProfile } from 'Pages/UserProfile';

export const baseURL = new URL(import.meta.env.BASE_URL, window.origin);
export const getAbsoluteRouteURL = (route: string) =>
    new URL(route.replace(/^\//, ''), baseURL.href.replace(/([^/])$/, '$1/'))
        .href;

export enum ROUTES {
    ROOT = '/',
    STRIPE = '/stripe',
    PLAID = '/plaid',
    PROTECTED = '/user',
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
                path: ROUTES.PROTECTED,
                element: (
                    <ProtectedRoute
                        component={() => (
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
        ],
        errorElement: <div>an error has occurred</div>,
    },
];
