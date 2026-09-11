import type { IncomingMessage, ServerResponse } from 'node:http';

/* ------------------------------------------------------------------ *
 * Proxy com sessão (BFF).
 *
 * Tudo que o navegador chama em /api passa por aqui. O que este módulo
 * faz que um proxy burro não faria:
 *
 *   1. no login, tira os tokens do corpo da resposta da API e guarda
 *      num cookie HttpOnly — o JavaScript da página nunca os vê;
 *   2. nas demais chamadas, lê esse cookie e monta o
 *      `Authorization: Bearer` do lado do servidor;
 *   3. renova o access token sozinho quando ele está pra vencer.
 *
 * Resultado: um XSS na página não consegue roubar a sessão, que é a
 * proteção que a API não oferece sozinha (ela devolve os tokens no corpo
 * do JSON, sem Set-Cookie).
 *
 * O mesmo handler roda no middleware do Vite (dev) e na função da Vercel
 * (produção), pra não existirem dois comportamentos diferentes.
 * ------------------------------------------------------------------ */

const COOKIE = 'gc_sess';
const COOKIE_PATH = '/api';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // o refresh token da API dura 7 dias

/** Renova quando faltar menos que isso pro access token vencer. */
const RENEW_MARGIN_MS = 60_000;

type Session = {
  /** access token (JWT) */
  at: string;
  /** refresh token (opaco) */
  rt: string;
  /** username — só pra UI saber quem está logado */
  u: string;
  /** papel normalizado */
  r: 'user' | 'admin';
};

function apiBase(): string {
  const raw = process.env.API_PROXY_TARGET || 'http://147.15.112.97:8080';
  return raw.replace(/\/+$/, '');
}

/* ------------------------------ cookie ------------------------------ */

function readSession(req: IncomingMessage): Session | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name !== COOKIE) continue;
    try {
      return JSON.parse(Buffer.from(rest.join('='), 'base64url').toString('utf8')) as Session;
    } catch {
      return null;
    }
  }
  return null;
}

function cookieAttributes(req: IncomingMessage): string {
  const host = String(req.headers.host ?? '');
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  // Secure só fora do localhost: em http://localhost o navegador aceita,
  // mas nem todo cliente de teste aceita — e localhost já é origem segura.
  return `Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict${local ? '' : '; Secure'}`;
}

function setSession(req: IncomingMessage, res: ServerResponse, session: Session): void {
  const value = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${value}; ${cookieAttributes(req)}; Max-Age=${COOKIE_MAX_AGE}`,
  );
}

function clearSession(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieAttributes(req)}; Max-Age=0`);
}

/* ------------------------------ helpers ------------------------------ */

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Resposta de sessão nunca pode ficar em cache compartilhado.
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  // Na Vercel o corpo já vem parseado; no Vite, não. Cobrimos os dois.
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed !== undefined && parsed !== null && parsed !== '') return parsed;

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return undefined;
  }
}

/** Lê o `exp` do JWT sem validar assinatura — quem valida é a API. */
function expiresAt(jwt: string): number {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return 0;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number;
    };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

const normalizeRole = (role: unknown): 'user' | 'admin' =>
  String(role ?? '').toLowerCase() === 'admin' ? 'admin' : 'user';

type AuthResponse = {
  token?: string;
  refreshToken?: string;
  username?: string;
  role?: string;
};

function toSession(payload: AuthResponse): Session | null {
  if (!payload.token || !payload.refreshToken) return null;
  return {
    at: payload.token,
    rt: payload.refreshToken,
    u: payload.username ?? '',
    r: normalizeRole(payload.role),
  };
}

/* ------------------------------ API calls ------------------------------ */

async function callApi(
  path: string,
  init: { method: string; body?: unknown; token?: string },
): Promise<{ status: number; payload: unknown }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.token) headers.Authorization = `Bearer ${init.token}`;

  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

/**
 * Troca o par de tokens por um novo.
 *
 * A API rotaciona o refresh token a cada uso. Como cada requisição roda
 * isolada (função serverless não compartilha estado), duas chamadas que
 * vencerem ao mesmo tempo podem tentar renovar em paralelo e uma delas
 * perde a corrida. Por isso renovamos de forma proativa, olhando o `exp`
 * antes de mandar a requisição — assim o caminho reativo (401) quase
 * nunca é usado. Se a corrida acontecer, o pior caso é a pessoa voltar
 * pro login.
 */
async function refresh(session: Session): Promise<Session | null> {
  const { status, payload } = await callApi('/api/Auth/refresh', {
    method: 'POST',
    body: { accessToken: session.at, refreshToken: session.rt },
  });
  if (status !== 200) return null;

  const next = toSession(payload as AuthResponse);
  if (!next) return null;
  // A API não devolve username no refresh em todos os casos; preserva o que temos.
  return { ...next, u: next.u || session.u, r: next.r || session.r };
}

/* ------------------------------ rotas ------------------------------ */

async function handleLogin(
  req: IncomingMessage,
  res: ServerResponse,
  path: '/api/Auth/login' | '/api/Auth/register',
): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown> | undefined;
  const { status, payload } = await callApi(path, { method: 'POST', body: body ?? {} });

  if (status !== 200 && status !== 201) {
    clearSession(req, res);
    json(res, status, payload ?? { message: 'não foi dessa vez' });
    return;
  }

  const session = toSession(payload as AuthResponse);
  if (!session) {
    json(res, 502, { message: 'a API respondeu sem token' });
    return;
  }

  setSession(req, res, session);
  // Só o que a UI precisa. Token nenhum atravessa essa fronteira.
  json(res, status, { nickname: session.u, role: session.r });
}

async function handleSession(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const session = readSession(req);
  if (!session) {
    json(res, 401, { message: 'não autenticado' });
    return;
  }
  json(res, 200, { nickname: session.u, role: session.r });
}

function handleLogout(req: IncomingMessage, res: ServerResponse): void {
  clearSession(req, res);
  res.statusCode = 204;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

/** Qualquer rota de dados: injeta o Bearer, renovando antes se precisar. */
async function handleProxied(
  req: IncomingMessage,
  res: ServerResponse,
  pathWithQuery: string,
): Promise<void> {
  let session = readSession(req);
  if (!session) {
    json(res, 401, { message: 'não autenticado' });
    return;
  }

  let rotated = false;

  if (expiresAt(session.at) - Date.now() < RENEW_MARGIN_MS) {
    const renewed = await refresh(session);
    if (!renewed) {
      clearSession(req, res);
      json(res, 401, { message: 'sessão expirada' });
      return;
    }
    session = renewed;
    rotated = true;
  }

  const body = req.method === 'GET' || req.method === 'DELETE' ? undefined : await readBody(req);

  let result = await callApi(pathWithQuery, {
    method: req.method ?? 'GET',
    body,
    token: session.at,
  });

  // Cinto e suspensório: se mesmo assim voltou 401, tenta renovar uma vez.
  if (result.status === 401) {
    const renewed = await refresh(session);
    if (!renewed) {
      clearSession(req, res);
      json(res, 401, { message: 'sessão expirada' });
      return;
    }
    session = renewed;
    rotated = true;
    result = await callApi(pathWithQuery, {
      method: req.method ?? 'GET',
      body,
      token: session.at,
    });
  }

  if (rotated) setSession(req, res, session);

  if (result.payload === undefined) {
    res.statusCode = result.status;
    res.setHeader('Cache-Control', 'no-store');
    res.end();
    return;
  }
  json(res, result.status, result.payload);
}

/* ------------------------------ entrada ------------------------------ */

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = (req.method ?? 'GET').toUpperCase();

  try {
    if (path === '/api/auth/login' && method === 'POST') {
      await handleLogin(req, res, '/api/Auth/login');
      return;
    }
    if (path === '/api/auth/register' && method === 'POST') {
      await handleLogin(req, res, '/api/Auth/register');
      return;
    }
    if (path === '/api/auth/session' && method === 'GET') {
      await handleSession(req, res);
      return;
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      handleLogout(req, res);
      return;
    }
    // O refresh é assunto interno do proxy — o navegador não chama.
    if (path === '/api/auth/refresh') {
      json(res, 404, { message: 'rota não exposta' });
      return;
    }

    await handleProxied(req, res, path + url.search);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    json(res, 502, { message: `não deu pra falar com a API: ${detail}` });
  }
}
