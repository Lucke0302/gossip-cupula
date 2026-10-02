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
 * Estes são chamadas de verdade para a API (`/api/events`), como posts e
 * comentários. O contrato está detalhado no README do front.
 *
 * A resposta passa por `eventSchema` e `goingResultSchema`, ambos
 * `.strict()`: um campo a mais — um `userId`, a lista de quem confirmou —
 * derruba a validação aqui. E é pra derrubar mesmo: o servidor guarda quem
 * confirmou (a chave composta impede confirmação duplicada), mas não conta
 * isso a ninguém; o que chega é só o agregado e o estado de quem pediu.
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
    signal,
  });
}

export function createEvent(input: CreateEventInput): Promise<CalendarEvent> {
  return request('/events', {
    method: 'POST',
    body: input,
    schema: eventSchema,
  });
}

/** Desfixar apaga o evento. Sem dono pra conferir — eventos são anônimos. */
export function deleteEvent(id: string): Promise<undefined> {
  return request(`/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: voidSchema,
  });
}

/** Alterna a própria confirmação. Devolve a contagem já atualizada. */
export function toggleGoing(id: string): Promise<GoingResult> {
  return request(`/events/${encodeURIComponent(id)}/going`, {
    method: 'POST',
    schema: goingResultSchema,
  });
}
