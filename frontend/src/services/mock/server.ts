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
import { USE_MOCKS } from '../../lib/env';

/* ------------------------------------------------------------------ *
 * Camada de mocks.
 *
 * Implementa o MESMO contrato que o backend real precisa cumprir (veja
 * o README). O client HTTP fala com ela exatamente como falaria com a
 * rede: mesma URL, mesmo verbo, mesmo status, mesmo corpo. Trocar
 * VITE_USE_MOCKS=false nao muda uma linha de codigo de tela.
 *
 * A sessao e' simulada por sessionStorage. No app de verdade quem manda
 * e' um cookie HttpOnly escrito pelo proxy, que o JS nao consegue ler —
 * e' a unica peca que um mock de navegador nao reproduz fielmente.
 * Do ponto de vista das telas o contrato e' identico: ninguem ve token.
 * ------------------------------------------------------------------ */

const LATENCY_MS = 420;
const SESSION_KEY = 'mock:session';

type MockSession = { nickname: string; role: 'user' | 'admin' };

function readSession(): MockSession | null {
  // Com a API real ligada, os mocks so' atendem o que ela ainda nao tem
  // (comentarios, fotos, links). Nesse caso quem autenticou foi o proxy,
  // la' atras — se este gate tambem exigisse login, ele responderia 401 e
  // derrubaria a sessao de verdade.
  if (!USE_MOCKS) return { nickname: '', role: 'user' };

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MockSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: MockSession | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* modo privado / storage bloqueado: a sessao nao persiste */
  }
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
    handler: (_init) => {
      // A API real aceita usuario OU e-mail no mesmo campo.
      const { identifier, password } = parseBody<{ identifier?: string; password?: string }>(_init);
      const clean = identifier?.trim().toLowerCase() ?? '';
      const account = accounts.find(
        (a) => (a.nickname === clean || a.email === clean) && a.password === password,
      );
      if (!account) return fail(401, 'usuário/e-mail ou senha que não abrem essa porta');

      const session: MockSession = { nickname: account.nickname, role: account.role };
      // No app de verdade e' aqui que o proxy manda Set-Cookie HttpOnly.
      writeSession(session);
      return json(session);
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/register$/,
    handler: (_init) => {
      const { username, email } = parseBody<{ username?: string; email?: string }>(_init);
      const clean = username?.trim().toLowerCase() ?? '';
      if (accounts.some((a) => a.nickname === clean)) {
        return fail(409, 'esse apelido já anda por aí');
      }
      if (!email?.includes('@')) return fail(400, 'e-mail inválido');

      const session: MockSession = { nickname: clean, role: 'user' };
      writeSession(session);
      return json(session, 201);
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/logout$/,
    handler: () => {
      writeSession(null);
      return new Response(null, { status: 204 });
    },
  },
  {
    method: 'GET',
    pattern: /^\/auth\/session$/,
    handler: () => {
      const session = readSession();
      if (!session) return unauthorized();
      return json(session);
    },
  },

  {
    method: 'GET',
    pattern: /^\/posts$/,
    handler: (_init, _params, url) => {
      if (!readSession()) return unauthorized();

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
    handler: (_init, params) => {
      if (!readSession()) return unauthorized();
      const post = posts.find((p) => p.id === params.id);
      if (!post) return fail(404, 'esse babado não existe (ou já sumiu)');
      return json(toPostDetail(post));
    },
  },
  {
    method: 'POST',
    pattern: /^\/posts$/,
    handler: (_init) => {
      const session = readSession();
      if (!session) return unauthorized();

      const { title, content, imageDataUrl } = parseBody<{
        title?: string;
        content?: string;
        imageDataUrl?: string | null;
      }>(_init);

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
    handler: (_init, params) => {
      if (!readSession()) return unauthorized();
      // Com a API real ligada os posts sao dela, nao desta lista —
      // conferir aqui daria 404 em post que existe de verdade.
      if (USE_MOCKS && !posts.some((p) => p.id === params.id)) {
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
    handler: (_init, params) => {
      const session = readSession();
      if (!session) return unauthorized();
      // Com a API real ligada os posts sao dela, nao desta lista —
      // conferir aqui daria 404 em post que existe de verdade.
      if (USE_MOCKS && !posts.some((p) => p.id === params.id)) {
        return fail(404, 'esse babado não existe (ou já sumiu)');
      }

      const { text } = parseBody<{ text?: string }>(_init);
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
    handler: (_init) => {
      if (!readSession()) return unauthorized();
      return json({ items: photos, nextCursor: null });
    },
  },
  {
    method: 'GET',
    pattern: /^\/links$/,
    handler: (_init) => {
      if (!readSession()) return unauthorized();
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
