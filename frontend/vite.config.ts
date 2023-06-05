import { defineConfig, loadEnv, ProxyOptions } from 'vite';
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
            ...proxyApiHandler(
                env.VITE_APP_STRIPE_BE_URL,
                PORT,
                (_, requestData) => getPaymentIntent(requestData)
            ),
            ...proxyApiHandler(
                env.VITE_APP_PLAID_BE_URL,
                PORT,
                plaidBESimulator
            ),
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

function proxyApiHandler(
    apiUrl: string | undefined,
    PORT: number,
    handler: (endpoint: string, requestData: object) => Promise<object>
): Record<string, ProxyOptions> | {} {
    return apiUrl
        ? {
              [apiUrl]: {
                  target: `http://0.0.0.0:${PORT}/`,
                  selfHandleResponse: true,
                  rewrite: (path) => path.replace(apiUrl, ''),
                  configure: (proxy /*, options*/) => {
                      let requestBody: object;
                      proxy.on('proxyReq', (proxyReq, req, res) => {
                          const requestEndpoint = req.url.replace(apiUrl, '');
                          const requestData = req.read();
                          try {
                              requestBody = JSON.parse(requestData);
                          } catch (e) {
                              console.error(
                                  'error parse request data',
                                  e.message
                              );
                              requestBody = {};
                              res.writeHead(400, {
                                  'Content-Type': 'text/plain',
                              });
                              res.end(`bad request`);
                          }

                          handler(requestEndpoint, requestBody)
                              .then(JSON.stringify)
                              .then(res.end.bind(res))
                              .catch((e) => {
                                  res.writeHead(500, {
                                      'Content-Type': 'text/plain',
                                  });
                                  res.end(`server error: ${e?.message}`);
                              });
                      });
                  },
              },
          }
        : {};
}
