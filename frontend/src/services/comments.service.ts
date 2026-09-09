import { request } from '../lib/http';
import {
  commentSchema,
  pageSchema,
  type Comment,
  type CreateCommentInput,
  type Page,
} from '../types';

const commentPageSchema = pageSchema(commentSchema);

export function listComments(postId: string, signal?: AbortSignal): Promise<Page<Comment>> {
  return request(`/posts/${encodeURIComponent(postId)}/comments`, {
    schema: commentPageSchema,
    signal,
  });
}

export function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  return request(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: { text: input.text },
    schema: commentSchema,
  });
}
