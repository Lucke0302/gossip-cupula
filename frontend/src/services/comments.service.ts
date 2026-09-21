import { request } from '../lib/http';
import {
  commentSchema,
  pageSchema,
  type Comment,
  type CreateCommentInput,
  type Page,
} from '../types';

/* ------------------------------------------------------------------ *
 * Comentarios.
 *
 * A API ainda NAO tem essas rotas — nao existe /posts/{id}/comments no
 * swagger. Entao aqui o `source: 'mock'` e' fixo: mesmo com a API ligada,
 * estas chamadas vao pra camada falsa, senao a tela de post levaria 404.
 *
 * O contrato abaixo e' o que o backend precisa implementar. Quando as
 * rotas existirem, e' so' tirar o `source` — o resto fica igual.
 * ------------------------------------------------------------------ */

const commentPageSchema = pageSchema(commentSchema);

export function listComments(postId: string, signal?: AbortSignal): Promise<Page<Comment>> {
  return request(`/posts/${encodeURIComponent(postId)}/comments`, {
    schema: commentPageSchema,
    source: 'mock',
    signal,
  });
}

export function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  return request(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: { text: input.text },
    schema: commentSchema,
    source: 'mock',
  });
}
