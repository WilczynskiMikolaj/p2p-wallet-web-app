import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function healthEndpoint(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    if (req.url?.split('?')[0] !== '/health') {
      next();
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      application: 'P2P Wallet Web',
    }));
  };

  return {
    name: 'health-endpoint',

    configureServer(server) {
      server.middlewares.use(handler);
    },

    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), healthEndpoint()],
});