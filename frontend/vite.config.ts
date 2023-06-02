import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import macrosPlugin from 'vite-plugin-babel-macros';
import svgr from 'vite-plugin-svgr';
import { getPaymentIntent } from './dev/stripe';
import { plaidBESimulator } from './dev/plaid';

const env = loadEnv('development', process.cwd(), '');

const PORT = 4200;
// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: PORT,
    host: '0.0.0.0',
    proxy: {
      // '/api': {
      //   target: 'http://jsonplaceholder.typicode.com',
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, ''),
      //   configure: (proxy, options) => {
      //     proxy.on('proxyReq', (proxyReq, req, _res) => {
      //       console.log(
      //         '[api]: Sending Request to the Target:',
      //         req.method,
      //         req.url
      //       );
      //     });
      //   },
      // },
      [env.VITE_APP_STRIPE_BE_URL]: {
        target: `http://0.0.0.0:${PORT}/`,
        selfHandleResponse: true,
        rewrite: (path) => path.replace(env.VITE_APP_STRIPE_BE_URL, ''),
        configure: (proxy/*, options*/) => {
          let requestBody: {
            amount: number;
            currency: string;
          };
          proxy.on('proxyReq', (proxyReq, req/*, res*/) => {
            requestBody = JSON.parse(req.read());
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            getPaymentIntent({
              amount: requestBody.amount,
              currency: requestBody.currency,
            })
              .then(JSON.stringify)
              .then(res.end.bind(res));
          });
        },
      },
      [env.VITE_APP_PLAID_BE_URL]: {
        target: `http://0.0.0.0:${PORT}/`,
        selfHandleResponse: true,
        rewrite: (path) => path.replace(env.VITE_APP_PLAID_BE_URL, ''),
        configure: (proxy/*, options*/) => {
          let requestBody;
          let requestUrl;
          proxy.on('proxyReq', (proxyReq, req/*, res*/) => {
            requestBody = JSON.parse(req.read());
            requestUrl = req.url;
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            plaidBESimulator(
              requestUrl.replace(env.VITE_APP_PLAID_BE_URL, ''),
              requestBody
            )
              .then(JSON.stringify)
              .then(res.end.bind(res));
          });
        },
      },
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    macrosPlugin(),
    svgr(),
    viteTsConfigPaths({
      root: './',
    }),
    react(),
  ],
});
