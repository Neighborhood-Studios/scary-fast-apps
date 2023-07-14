import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
//
import { AuthProvider, hasAuth } from 'Services/auth';
import { ApolloClientProvider } from 'Services/backend';
import { heap } from 'Services/heap';
import { RecoilRoot } from 'recoil';
//
import './index.css';
import { baseURL } from './routes.tsx';
import { App } from './App.tsx';

heap.load();

//eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <RecoilRoot>
            <BrowserRouter basename={baseURL.pathname}>
                <AuthProvider>
                    <ApolloClientProvider hasAuth={hasAuth}>
                        <App />
                    </ApolloClientProvider>
                </AuthProvider>
            </BrowserRouter>
        </RecoilRoot>
    </React.StrictMode>
);
