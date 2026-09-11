import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * O front nunca fala com a API direto do navegador.
 *
 * Motivo: a API (http://147.15.112.97:8080) não manda nenhum header de
 * CORS — o preflight devolve 405 sem `Access-Control-Allow-Origin`, então
 * o navegador bloqueia qualquer chamada cross-origin. Além disso ela é
 * HTTP puro, e uma página servida em HTTPS (Vercel) não pode chamar HTTP
 * (mixed content).
 *
 * Os dois problemas somem quando a requisição sai de um servidor em vez
 * do navegador. Em desenvolvimento quem faz esse salto é o proxy do Vite;
 * em produção, o rewrite do vercel.json. Nos dois casos o front chama
 * `/api/...` na própria origem e não sabe que existe outro host.
 */
export default defineConfig(({ mode }) => {
  // '.' em vez de process.cwd(): o tsconfig não carrega os tipos do Node,
  // e o diretório atual já é a raiz do projeto quando o Vite roda.
  const env = loadEnv(mode, '.', '');
  const target = env.API_PROXY_TARGET || 'http://147.15.112.97:8080';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
  };
});
