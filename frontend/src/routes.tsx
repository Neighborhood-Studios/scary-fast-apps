import { createBrowserRouter } from 'react-router-dom';
import { App } from 'App.tsx';
import { Order, routes as orderRoutes } from 'Pages/Order.tsx';
import { Home } from 'Pages/Home.tsx';

export const baseURL = new URL(import.meta.env.BASE_URL, window.origin);
export const getAbsoluteUrl = (route: string) => new URL(route, baseURL.href);

export enum ROUTES {
  INDEX = '/',
  ORDER = '/order',
}

export const router = createBrowserRouter(
  [
    {
      path: ROUTES.INDEX,
      element: <App />,
      children: [
        {
          index: true,
          element: <Home />,
        },
        {
          path: ROUTES.ORDER,
          element: <Order />,
          children: orderRoutes,
        },
      ],
      errorElement: <div>an error has occurred</div>,
    },
  ],
  { basename: baseURL.pathname }
);
