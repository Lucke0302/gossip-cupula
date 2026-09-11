import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApiRequest } from './server/session-proxy';

/**
 * Em desenvolvimento, monta o mesmo proxy-com-sessão que a Vercel roda em
 * produção (api/[...path].ts). Nada de `server.proxy`: um proxy burro não
 * conseguiria trocar os tokens do corpo da resposta por um cookie
 * HttpOnly, que é justamente o ponto.
 */
function sessionProxy(): PluginOption {
  return {
    name: 'gossip-session-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        void handleApiRequest(req, res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '.' em vez de process.cwd(): o diretório atual já é a raiz do projeto
  // quando o Vite roda.
  const env = loadEnv(mode, '.', '');
  // Repassa pro handler, que lê de process.env nos dois ambientes.
  if (env.API_PROXY_TARGET) process.env.API_PROXY_TARGET = env.API_PROXY_TARGET;

  return {
    plugins: [react(), sessionProxy()],
    server: { port: 5173 },
  };
});
