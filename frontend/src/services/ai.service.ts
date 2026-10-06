import { request } from '../lib/http';
import { gossipfyResponseSchema, type GossipfyResponse } from '../types';

/* ------------------------------------------------------------------ *
 * Gossipficar — a IA que reescreve o texto no tom da Gossip Girl.
 *
 * Rota real: `POST /api/ai/gossipfy` (AITransformationController).
 *
 * Atenção para quem for mexer: o arquivo `backend/gossipfy-updates.md`
 * descreve outra coisa — `POST /api/v2/gossip`, com `tags`, `isAnonymous`
 * e um autor na resposta. Esse endpoint NÃO existe. O que vale é o
 * `endpoint-mapping.md` e o `AITransformationController`, que é o que
 * está implementado aqui.
 * ------------------------------------------------------------------ */

export function gossipfy(
  content: string,
  /**
   * Token da transformação anterior deste mesmo texto.
   *
   * Reenviar faz o servidor recusar com 400 — é assim que ele impede
   * gossipficar duas vezes. A tela usa isso como cinto de segurança: o
   * botão já se desabilita depois da primeira vez, mas se algo escapar,
   * quem decide é o servidor.
   */
  gossipifiedPostId?: string | null,
): Promise<GossipfyResponse> {
  return request('/ai/gossipfy', {
    method: 'POST',
    body: {
      content,
      ...(gossipifiedPostId ? { gossipifiedPostId } : {}),
    },
    schema: gossipfyResponseSchema,
  });
}
