import { z } from 'zod';
import { request } from '../lib/http';
import {
  eventSchema,
  goingResultSchema,
  pageSchema,
  type CalendarEvent,
  type CreateEventInput,
  type GoingResult,
  type Page,
} from '../types';

/* ------------------------------------------------------------------ *
 * Eventos do calendário.
 *
 * A API ainda NÃO tem essas rotas — não existe nada de evento no
 * swagger. Por isso o `source: 'mock'` é fixo aqui: mesmo com a API
 * ligada, estas chamadas vão para a camada falsa, senão a tela levaria
 * 404. É o mesmo arranjo que comentários tiveram até as rotas existirem.
 *
 * O contrato abaixo é o que o backend precisa implementar; está
 * detalhado no README. Quando as rotas existirem, basta remover o
 * `source` — nenhuma tela muda.
 * ------------------------------------------------------------------ */

const eventPageSchema = pageSchema(eventSchema);
const voidSchema = z.undefined();

/**
 * Eventos de um mês. `month` no formato YYYY-MM.
 *
 * Paginação não se aplica de verdade aqui (um mês cabe numa resposta),
 * mas o envelope `{ items, nextCursor }` é o mesmo do resto da API para
 * não inventar um segundo formato.
 */
export function listEvents(month: string, signal?: AbortSignal): Promise<Page<CalendarEvent>> {
  return request('/events', {
    query: { month },
    schema: eventPageSchema,
    source: 'mock',
    signal,
  });
}

export function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  return request('/events', {
    method: 'POST',
    body: input,
    schema: eventSchema,
    source: 'mock',
  });
}

/** Desfixar apaga o evento. Sem dono pra conferir — eventos são anônimos. */
export function deleteEvent(id: string): Promise<undefined> {
  return request(`/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: voidSchema,
    source: 'mock',
  });
}

/** Alterna a própria confirmação. Devolve a contagem já atualizada. */
export function toggleGoing(id: string): Promise<GoingResult> {
  return request(`/events/${encodeURIComponent(id)}/going`, {
    method: 'POST',
    schema: goingResultSchema,
    source: 'mock',
  });
}
