import { request } from '../lib/http';
import {
  pageSchema,
  postDetailSchema,
  postSchema,
  type CreatePostInput,
  type Page,
  type Post,
  type PostDetail,
} from '../types';

const postPageSchema = pageSchema(postSchema);

/** Feed paginado por cursor opaco. Nada de `?page=2`. */
export function listPosts(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<Page<Post>> {
  return request('/posts', {
    query: { cursor: cursor ?? undefined, limit: 4 },
    schema: postPageSchema,
    signal,
  });
}

export function getPost(id: string, signal?: AbortSignal): Promise<PostDetail> {
  return request(`/posts/${encodeURIComponent(id)}`, {
    schema: postDetailSchema,
    signal,
  });
}

/**
 * Cria um post. A autoria vai implicita no Authorization header e para
 * no backend — a resposta ja volta anonima, igual a de qualquer leitura.
 */
export function createPost(input: CreatePostInput): Promise<PostDetail> {
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
