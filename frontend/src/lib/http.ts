import type { z } from 'zod';
import { API_URL, USE_MOCKS } from './env';
import { ApiError, ContractError, SessionExpiredError } from './errors';
import { mockFetch } from '../services/mock/server';

/* ------------------------------------------------------------------ *
 * Client HTTP unico.
 *
 * Centraliza: baseURL, credentials, serializacao, tratamento de erro e
 * validacao Zod. Nada fora de src/services deve chamar `fetch`.
 *
 * O que NAO esta mais aqui: token, header Authorization, ciclo de
 * refresh e fila de renovacao. Isso tudo mudou de lado — agora vive no
 * proxy-com-sessao (server/session-proxy.ts), que guarda os tokens num
 * cookie HttpOnly. O JavaScript desta pagina nao tem acesso a eles, e e'
 * exatamente esse o objetivo: um XSS aqui nao rouba sessao nenhuma.
 * ------------------------------------------------------------------ */

/** Avisado quando o proxy responde 401 — a sessao caiu. */
let onUnauthorized: () => void = () => {};

export function configureHttp(hooks: { onUnauthorized: () => void }): void {
  onUnauthorized = hooks.onUnauthorized;
}

export type RequestOptions<TSchema extends z.ZodTypeAny> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema: TSchema;
  signal?: AbortSignal;
  /** Login e cadastro respondem 401 sem que a sessao "tenha caido". */
  skipSessionDrop?: boolean;
  query?: Record<string, string | number | undefined | null>;
};

function transport(path: string, init: RequestInit): Promise<Response> {
  if (USE_MOCKS) return mockFetch(path, init);
  return fetch(`${API_URL}${path}`, init);
}

function buildUrl(path: string, query: RequestOptions<z.ZodTypeAny>['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function readError(response: Response): Promise<ApiError> {
  let message = `erro ${response.status}`;
  let details: unknown;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    details = data;
    if (typeof data.message === 'string') message = data.message;
    else if (typeof data.title === 'string') message = data.title;
  } catch {
    /* corpo vazio ou nao-JSON: fica com a mensagem padrao */
  }
  return new ApiError(response.status, message, details);
}

export async function request<TSchema extends z.ZodTypeAny>(
  path: string,
  options: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await transport(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    // Obrigatorio: o cookie de sessao e' HttpOnly e so viaja com isso.
    credentials: 'include',
    signal: options.signal,
  });

  if (response.status === 401 && !options.skipSessionDrop) {
    // O proxy ja tentou renovar antes de desistir. Chegou 401 aqui, acabou.
    onUnauthorized();
    throw new SessionExpiredError();
  }

  if (!response.ok) throw await readError(response);

  if (response.status === 204) {
    const empty = options.schema.safeParse(undefined);
    if (!empty.success) throw new ContractError(path, empty.error.issues);
    return empty.data as z.infer<TSchema>;
  }

  const raw = (await response.json()) as unknown;
  const parsed = options.schema.safeParse(raw);

  if (!parsed.success) {
    // Um `unrecognized_keys` aqui normalmente significa que o backend
    // vazou um campo de autor. E pra explodir mesmo.
    if (import.meta.env.DEV) {
      console.error(`[contrato] ${path}`, parsed.error.issues, raw);
    }
    throw new ContractError(path, parsed.error.issues);
  }

  return parsed.data as z.infer<TSchema>;
}
