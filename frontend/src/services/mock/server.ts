import {
  accounts,
  comments,
  coarse,
  links,
  opaqueId,
  photos,
  posts,
  type MockComment,
  type MockPost,
} from './data';

/* ------------------------------------------------------------------ *
 * Camada de mocks.
 *
 * Implementa o MESMO contrato que o backend real precisa cumprir (veja
 * o README). O client HTTP fala com ela exatamente como falaria com a
 * rede: mesma URL, mesmo verbo, mesmo status, mesmo corpo. Trocar
 * VITE_USE_MOCKS=false nao muda uma linha de codigo de tela.
 *
 * O "cookie httpOnly" de refresh e' simulado por sessionStorage: e' a
 * unica peca que um mock de navegador nao consegue reproduzir de
 * verdade, porque cookie httpOnly, por definicao, o JS nao ve.
 * ------------------------------------------------------------------ */

const LATENCY_MS = 420;
const ACCESS_TTL_S = 15 * 60;
const REFRESH_COOKIE_KEY = 'mock:refresh';

type MockSession = { nickname: string; role: 'user' | 'admin' };

/** Access tokens emitidos nesta aba, com a hora de expirar. */
const issued = new Map<string, { session: MockSession; expiresAt: number }>();

function readRefreshCookie(): MockSession | null {
  try {
    const raw = sessionStorage.getItem(REFRESH_COOKIE_KEY);
    return raw ? (JSON.parse(raw) as MockSession) : null;
  } catch {
    return null;
  }
}

function writeRefreshCookie(session: MockSession | null): void {
  try {
    if (session) sessionStorage.setItem(REFRESH_COOKIE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(REFRESH_COOKIE_KEY);
  } catch {
    /* modo privado / storage bloqueado: a sessao vira so-memoria */
  }
}

function issueToken(session: MockSession): string {
  const token = `mock.${opaqueId()}.${opaqueId()}`;
  issued.set(token, { session, expiresAt: Date.now() + ACCESS_TTL_S * 1000 });
  return token;
}

function sessionFrom(init: RequestInit): MockSession | null {
  const headers = new Headers(init.headers);
  const auth = headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const entry = issued.get(auth.slice(7));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry.session;
}

/* ------------------------------ helpers ------------------------------ */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(status: number, message: string): Response {
  return json({ message }, status);
}

const unauthorized = () => fail(401, 'não autenticado');

function parseBody<T>(init: RequestInit): T {
  if (typeof init.body !== 'string' || init.body === '') return {} as T;
  return JSON.parse(init.body) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ordena por hora cheia (desc) e embaralha os empates.
 * Dois posts da mesma hora aparecem em ordem imprevisivel — de proposito:
 * ordem de insercao estavel entregaria quem postou primeiro.
 */
function feedOrder(list: MockPost[]): MockPost[] {
  const withNoise = list.map((post) => ({ post, noise: Math.random() }));
  withNoise.sort((a, b) => {
    const delta = Date.parse(b.post.publishedAt) - Date.parse(a.post.publishedAt);
    return delta !== 0 ? delta : a.noise - b.noise;
  });
  return withNoise.map((entry) => entry.post);
}

/** Resumo de post: sem body, sem autor. */
function toPostSummary(post: MockPost) {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: post.imageUrl,
    imageAlt: post.imageAlt,
    commentCount: comments.filter((c) => c.postId === post.id).length,
    publishedAt: post.publishedAt,
  };
}

function toPostDetail(post: MockPost) {
  return { ...toPostSummary(post), body: post.body };
}

/** Comentario publico: id, texto, hora. Nada mais. */
function toComment(comment: MockComment) {
  return { id: comment.id, text: comment.text, publishedAt: comment.publishedAt };
}

/* ------------------------------ rotas ------------------------------ */

type Handler = (init: RequestInit, params: Record<string, string>, url: URL) => Response;

const routes: Array<{ method: string; pattern: RegExp; handler: Handler }> = [
  {
    method: 'POST',
    pattern: /^\/auth\/login$/,
    handler: (init) => {
      const { nickname, password } = parseBody<{ nickname?: string; password?: string }>(init);
      const account = accounts.find(
        (a) => a.nickname === nickname?.trim().toLowerCase() && a.password === password,
      );
      if (!account) return fail(401, 'apelido ou senha que não abrem essa porta');

      const session: MockSession = { nickname: account.nickname, role: account.role };
      writeRefreshCookie(session); // = Set-Cookie: refresh=...; HttpOnly; Secure
      return json({
        nickname: session.nickname,
        role: session.role,
        expiresIn: ACCESS_TTL_S,
        accessToken: issueToken(session),
      });
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/register$/,
    handler: (init) => {
      const { nickname, inviteCode } = parseBody<{ nickname?: string; inviteCode?: string }>(init);
      const clean = nickname?.trim().toLowerCase() ?? '';
      if (accounts.some((a) => a.nickname === clean)) {
        return fail(409, 'esse apelido já anda por aí');
      }
      if (!/^[A-Z]{2}-\d{4}$/.test(inviteCode ?? '')) {
        return fail(400, 'convite inválido. tenta com quem te chamou.');
      }
      const session: MockSession = { nickname: clean, role: 'user' };
      writeRefreshCookie(session);
      return json(
        {
          nickname: session.nickname,
          role: session.role,
          expiresIn: ACCESS_TTL_S,
          accessToken: issueToken(session),
        },
        201,
      );
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/refresh$/,
    handler: () => {
      const session = readRefreshCookie();
      if (!session) return fail(401, 'refresh token inválido');
      return json({ accessToken: issueToken(session), expiresIn: ACCESS_TTL_S });
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/logout$/,
    handler: () => {
      writeRefreshCookie(null);
      issued.clear();
      return new Response(null, { status: 204 });
    },
  },
  {
    method: 'GET',
    pattern: /^\/auth\/session$/,
    handler: (init) => {
      const session = sessionFrom(init);
      if (!session) return unauthorized();
      return json({ nickname: session.nickname, role: session.role });
    },
  },

  {
    method: 'GET',
    pattern: /^\/posts$/,
    handler: (init, _params, url) => {
      if (!sessionFrom(init)) return unauthorized();

      const limit = Math.min(Number(url.searchParams.get('limit') ?? 4) || 4, 20);
      const cursor = url.searchParams.get('cursor');
      const ordered = feedOrder(posts);

      const start = cursor ? ordered.findIndex((p) => p.id === cursor) + 1 : 0;
      const slice = ordered.slice(start, start + limit);
      const last = slice.at(-1);
      const hasMore = last ? start + limit < ordered.length : false;

      return json({
        items: slice.map(toPostSummary),
        nextCursor: hasMore && last ? last.id : null,
      });
    },
  },
  {
    method: 'GET',
    pattern: /^\/posts\/([^/]+)$/,
    handler: (init, params) => {
      if (!sessionFrom(init)) return unauthorized();
      const post = posts.find((p) => p.id === params.id);
      if (!post) return fail(404, 'esse babado não existe (ou já sumiu)');
      return json(toPostDetail(post));
    },
  },
  {
    method: 'POST',
    pattern: /^\/posts$/,
    handler: (init) => {
      const session = sessionFrom(init);
      if (!session) return unauthorized();

      const { title, content, imageDataUrl } = parseBody<{
        title?: string;
        content?: string;
        imageDataUrl?: string | null;
      }>(init);

      if (!title?.trim() || !content?.trim()) {
        return fail(400, 'manchete e babado são obrigatórios');
      }

      const paragraphs = content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

      const created: MockPost = {
        id: opaqueId(),
        title: title.trim(),
        excerpt: (paragraphs[0] ?? content).slice(0, 220),
        body: paragraphs.length > 0 ? paragraphs : [content.trim()],
        imageUrl: imageDataUrl ?? null,
        imageAlt: imageDataUrl ? 'Foto anexada ao post' : null,
        // A autoria (session.nickname) para AQUI. Nao entra no registro.
        publishedAt: coarse(new Date()),
      };

      posts.unshift(created);
      return json(toPostDetail(created), 201);
    },
  },

  {
    method: 'GET',
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (init, params) => {
      if (!sessionFrom(init)) return unauthorized();
      if (!posts.some((p) => p.id === params.id)) {
        return fail(404, 'esse babado não existe (ou já sumiu)');
      }
      const items = comments
        .filter((c) => c.postId === params.id)
        .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt))
        .map(toComment);
      return json({ items, nextCursor: null });
    },
  },
  {
    method: 'POST',
    pattern: /^\/posts\/([^/]+)\/comments$/,
    handler: (init, params) => {
      const session = sessionFrom(init);
      if (!session) return unauthorized();
      if (!posts.some((p) => p.id === params.id)) {
        return fail(404, 'esse babado não existe (ou já sumiu)');
      }

      const { text } = parseBody<{ text?: string }>(init);
      if (!text?.trim()) return fail(400, 'escreve alguma coisa');

      // Uma em cada oito falha, pra dar pra ver o rollback otimista rodando.
      if (Math.random() < 0.125) return fail(503, 'a fonte não respondeu. tenta de novo.');

      const created: MockComment = {
        id: opaqueId(),
        postId: params.id ?? '',
        text: text.trim(),
        // De novo: nada de autor.
        publishedAt: coarse(new Date()),
      };
      comments.push(created);
      return json(toComment(created), 201);
    },
  },

  {
    method: 'GET',
    pattern: /^\/photos$/,
    handler: (init) => {
      if (!sessionFrom(init)) return unauthorized();
      return json({ items: photos, nextCursor: null });
    },
  },
  {
    method: 'GET',
    pattern: /^\/links$/,
    handler: (init) => {
      if (!sessionFrom(init)) return unauthorized();
      return json({ items: links, nextCursor: null });
    },
  },
];

export async function mockFetch(path: string, init: RequestInit): Promise<Response> {
  await sleep(LATENCY_MS);

  const url = new URL(path, 'http://mock.local');
  const method = (init.method ?? 'GET').toUpperCase();

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.pattern.exec(url.pathname);
    if (!match) continue;
    return route.handler(init, { id: match[1] ?? '' }, url);
  }

  return fail(404, `rota mockada não encontrada: ${method} ${url.pathname}`);
}
