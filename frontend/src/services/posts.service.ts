import { z } from 'zod';
import { request } from '../lib/http';
import { USE_MOCKS } from '../lib/env';
import {
  pageSchema,
  postDetailSchema,
  postSchema,
  voteResultSchema,
  type CreatePostInput,
  type Page,
  type Post,
  type PostDetail,
  type VoteResult,
  type VoteValue,
} from '../types';
import * as live from './backend/posts';

/* ------------------------------------------------------------------ *
 * Porta de entrada dos posts. As telas chamam daqui e não sabem de onde
 * o dado veio.
 *
 * Duas fontes, mesma assinatura:
 *
 *  - mocks: já falam o contrato anônimo que a gente quer que a API fale
 *    um dia, então vêm prontos e só passam pelo schema;
 *  - API real: fala outro contrato (array cru, campo de autor, data com
 *    segundos), então passa pela tradução em services/backend.
 * ------------------------------------------------------------------ */

const postPageSchema = pageSchema(postSchema);

export function listPosts(cursor: string | null, signal?: AbortSignal): Promise<Page<Post>> {
  if (!USE_MOCKS) return live.listPosts(cursor, signal);

  return request('/posts', {
    query: { cursor: cursor ?? undefined, limit: 4 },
    schema: postPageSchema,
    signal,
  });
}

export function getPost(id: string, signal?: AbortSignal): Promise<PostDetail> {
  if (!USE_MOCKS) return live.getPost(id, signal);

  return request(`/posts/${encodeURIComponent(id)}`, {
    schema: postDetailSchema,
    signal,
  });
}

/**
 * Apaga um post — irreversível, e só para admin.
 *
 * O front esconde o botão de quem não é admin por conveniência; quem
 * barra de verdade é o 403 da API.
 */
export function deletePost(id: string): Promise<undefined> {
  if (!USE_MOCKS) return live.deletePost(id);

  return request(`/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: z.undefined(),
  });
}

/**
 * Vota num post. 1 = amei, -1 = credo.
 *
 * Mesma rota nos dois mundos — o mock imita a regra da API.
 */
export function votePost(id: string, voteType: VoteValue): Promise<VoteResult> {
  if (!USE_MOCKS) return live.votePost(id, voteType);

  return request(`/posts/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    body: { voteType },
    schema: voteResultSchema,
  });
}

export function createPost(input: CreatePostInput): Promise<PostDetail> {
  if (!USE_MOCKS) return live.createPost(input);

  return request('/posts', {
    method: 'POST',
    body: {
      title: input.title,
      content: input.content,
      imageDataUrl: input.imageDataUrl,
    },
    schema: postDetailSchema,
  });
}
