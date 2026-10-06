import { z } from 'zod';
import { request } from '../../lib/http';
import {
  voteResultSchema,
  type CreatePostInput,
  type Page,
  type Post,
  type PostDetail,
  type VoteResult,
  type VoteValue,
} from '../../types';
import { backendPostListSchema, backendPostSchema, toPost, toPostDetail } from './dto';

/* ------------------------------------------------------------------ *
 * Posts contra a API de verdade.
 *
 * A API devolve `GET /posts` como um array inteiro, sem paginação. Até
 * existir cursor do lado do servidor, a fatia é feita aqui — a interface
 * de fora continua sendo a mesma `Page<Post>` com cursor opaco, então as
 * telas não sabem (nem precisam saber) onde a paginação acontece.
 * ------------------------------------------------------------------ */

const TAMANHO_DA_PAGINA = 4;

export async function listPosts(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Post>> {
  const dtos = await request('/posts', {
    schema: backendPostListSchema,
    signal,
  });

  const posts = dtos.map(toPost);

  // O cursor é o id do último post entregue. Se ele sumiu entre uma
  // página e outra (post apagado), recomeça do topo em vez de quebrar.
  const inicio = cursor ? posts.findIndex((post) => post.id === cursor) + 1 : 0;
  const fatia = posts.slice(inicio, inicio + TAMANHO_DA_PAGINA);
  const ultimo = fatia.at(-1);
  const temMais = inicio + TAMANHO_DA_PAGINA < posts.length;

  return {
    items: fatia,
    nextCursor: temMais && ultimo ? ultimo.id : null,
  };
}

export function getPost(id: string, signal?: AbortSignal): Promise<PostDetail> {
  return request(`/posts/${encodeURIComponent(id)}`, {
    schema: backendPostSchema,
    signal,
  }).then(toPostDetail);
}

/**
 * Monta o `multipart/form-data` do `POST /posts`.
 *
 * O backend recebe `[FromForm] CreatePostFormRequest`: `Text` vira o
 * content do post, `Title` e' a manchete e `Images` e' a lista de
 * arquivos. Os nomes vao na mesma caixa das propriedades C# — o binder
 * de formulario do ASP.NET e' case-insensitive, entao `text`/`images`
 * tambem casariam; o que NAO pode faltar e' o arquivo ir como `File`
 * dentro do FormData.
 *
 * Quem define o `Content-Type` (com o boundary) e' o navegador: este
 * objeto vai pro `fetch` do jeito que esta' — veja `montarCorpo` em
 * src/lib/http.ts.
 *
 * O mock usa esta mesma funcao, de proposito: ele responde ao request
 * exatamente como a API responderia, multipart incluido.
 */
export function buildCreatePostForm(input: CreatePostInput): FormData {
  const form = new FormData();
  form.append('Text', input.content);
  form.append('Title', input.title);
  for (const file of input.images) form.append('Images', file);
  // So' vai quando o texto passou pela IA. Campo ausente = post comum, e
  // o binder deixa o Guid? como null — mandar string vazia daria 400.
  if (input.gossipifiedPostId) form.append('GossipifiedPostId', input.gossipifiedPostId);
  return form;
}

/**
 * Publica.
 *
 * `POST /posts` e' a rota multipart (texto + arquivos). O contrato
 * antigo, so' texto, continua vivo em `/posts/json`, mas nao vale a pena
 * manter dois caminhos no front: sem foto, o FormData vai igual e o
 * resultado e' o mesmo post.
 */
export function createPost(input: CreatePostInput): Promise<PostDetail> {
  return request('/posts', {
    method: 'POST',
    body: buildCreatePostForm(input),
    schema: backendPostSchema,
  }).then(toPostDetail);
}

/**
 * Vota. `voteType` 1 = amei, -1 = credo.
 *
 * A API alterna sozinha: mesmo voto duas vezes remove, voto diferente
 * troca. A resposta traz as contagens ja' atualizadas.
 */
export function votePost(id: string, voteType: VoteValue): Promise<VoteResult> {
  return request(`/posts/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    body: { voteType },
    schema: voteResultSchema,
  });
}

/**
 * Apaga um post. So' quem tem role Admin — a API devolve 403 pro resto.
 */
export function deletePost(id: string): Promise<undefined> {
  return request(`/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: z.undefined(),
  });
}
