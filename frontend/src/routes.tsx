import { createBrowserRouter } from 'react-router-dom';
import { App } from 'App.tsx';
import { StripeOrder, routes as orderRoutes } from 'Pages/StripeOrder.tsx';
import { Home } from 'Pages/Home.tsx';
import { PlaidComponent } from 'Pages/PlaidComponent.tsx';

export const baseURL = new URL(import.meta.env.BASE_URL, window.origin);
export const getAbsoluteUrl = (route: string) => new URL(route, baseURL.href);

export enum ROUTES {
  ROOT = '/',
  STRIPE = '/stripe',
  PLAID = '/plaid',
}

export const router = createBrowserRouter(
  [
    {
      path: ROUTES.ROOT,
      element: <App />,
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
      ],
      errorElement: <div>an error has occurred</div>,
    },
  ],
  { basename: baseURL.pathname }
);
