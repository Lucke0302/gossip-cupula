import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../server/session-proxy';

/**
 * Entrada da Vercel para tudo que bate em /api.
 *
 * É só uma casca: a lógica inteira vive em server/session-proxy.ts, que é
 * o mesmo módulo carregado pelo middleware do Vite em desenvolvimento.
 * Um handler só, dois ambientes — sem risco de comportarem diferente.
 */
export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleApiRequest(req, res);
}
