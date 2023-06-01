import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { AuthProvider, hasAuth } from 'Services/auth';
import {
  ApolloClientProvider,
} from 'Services/backend';
import { heap } from 'Services/heap';

import './index.css';
import { router } from './routes.tsx';

heap.load();

//eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <AuthProvider>
        <ApolloClientProvider hasAuth={hasAuth}>
          <RouterProvider router={router} />
        </ApolloClientProvider>
      </AuthProvider>
  </React.StrictMode>
);
