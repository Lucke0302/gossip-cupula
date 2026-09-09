import type { z } from 'zod';
import { API_URL, USE_MOCKS } from './env';
import { ApiError, ContractError, SessionExpiredError } from './errors';
import { mockFetch } from '../services/mock/server';

/* ------------------------------------------------------------------ *
 * Client HTTP unico.
 *
 * Centraliza: baseURL, credentials, serializacao, tratamento de erro,
 * validacao Zod e o ciclo de refresh de token.
 *
 * Nada fora de src/services deve chamar `fetch` diretamente.
 * ------------------------------------------------------------------ */

type Hooks = {
  /** Access token atual, guardado em memoria pelo AuthContext. */
  getAccessToken: () => string | null;
  /** Novo access token depois de um refresh bem-sucedido. */
  onTokenRefreshed: (accessToken: string, expiresIn: number) => void;
  /** Refresh falhou: derruba a sessao e manda pro /login. */
  onSessionLost: () => void;
};

let hooks: Hooks = {
  getAccessToken: () => null,
  onTokenRefreshed: () => {},
  onSessionLost: () => {},
};

export function configureHttp(next: Hooks): void {
  hooks = next;
}

export type RequestOptions<TSchema extends z.ZodTypeAny> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema: TSchema;
  signal?: AbortSignal;
  /** Rotas publicas (login, cadastro, refresh) nao entram no ciclo de 401. */
  skipAuthRetry?: boolean;
  query?: Record<string, string | number | undefined | null>;
};

/* ---------------------- fila de refresh ---------------------- *
 * Se cinco requisicoes tomarem 401 ao mesmo tempo, so UMA chama
 * /auth/refresh. As outras esperam nessa promise e depois repetem
 * a requisicao original com o token novo.
 * ------------------------------------------------------------- */
let refreshInFlight: Promise<string> | null = null;

async function runRefresh(): Promise<string> {
  const response = await transport('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // O refresh token vive num cookie httpOnly + Secure setado pelo backend.
    // Ele nunca passa por JS, por isso o corpo vai vazio.
    body: '{}',
    credentials: 'include',
  });

  if (!response.ok) throw new SessionExpiredError();

  const payload = (await response.json()) as { accessToken?: unknown; expiresIn?: unknown };

  if (typeof payload.accessToken !== 'string' || typeof payload.expiresIn !== 'number') {
    throw new SessionExpiredError();
  }

  hooks.onTokenRefreshed(payload.accessToken, payload.expiresIn);
  return payload.accessToken;
}

function refreshOnce(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Ponto unico de saida: rede de verdade, ou a camada de mocks. */
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
  const url = buildUrl(path, options.query);

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    const token = hooks.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    return transport(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Obrigatorio: o refresh token mora num cookie httpOnly.
      credentials: 'include',
      signal: options.signal,
    });
  };

  let response = await send();

  if (response.status === 401 && !options.skipAuthRetry) {
    try {
      await refreshOnce();
    } catch {
      hooks.onSessionLost();
      throw new SessionExpiredError();
    }
    // Uma unica retentativa. Se der 401 de novo, a sessao morreu mesmo.
    response = await send();
    if (response.status === 401) {
      hooks.onSessionLost();
      throw new SessionExpiredError();
    }
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
