import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { createComment, listComments } from '../services/comments.service';
import type { Comment, CreateCommentInput, Page, PostDetail } from '../types';

export function useComments(postId: string | undefined, enabled: boolean) {
  return useQuery<Page<Comment>, Error>({
    queryKey: queryKeys.comments(postId ?? ''),
    queryFn: ({ signal }) => listComments(postId ?? '', signal),
    enabled: enabled && Boolean(postId),
  });
}

/** Id temporario do comentario otimista. Some assim que o servidor responde. */
const optimisticId = () => `pendente-${Math.random().toString(36).slice(2, 12)}`;

export function useCreateComment(postId: string) {
  const client = useQueryClient();
  const key = queryKeys.comments(postId);

  return useMutation<Comment, Error, CreateCommentInput, { previous?: Page<Comment>; tempId: string }>({
    mutationFn: (input) => createComment(postId, input),

    // Otimista: o comentario aparece na hora. Se falhar, volta atras.
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Page<Comment>>(key);
      const tempId = optimisticId();

      const pending: Comment = {
        id: tempId,
        text: input.text.trim(),
        // Hora cheia, igual ao que o servidor devolveria.
        publishedAt: new Date(new Date().setUTCMinutes(0, 0, 0)).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      };

      client.setQueryData<Page<Comment>>(key, {
        items: [...(previous?.items ?? []), pending],
        nextCursor: previous?.nextCursor ?? null,
      });

      // Contador do post acompanha o otimismo.
      client.setQueryData<PostDetail>(queryKeys.post(postId), (post) =>
        post ? { ...post, commentCount: post.commentCount + 1 } : post,
      );

      return { previous, tempId };
    },

    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(key, context.previous);
      client.setQueryData<PostDetail>(queryKeys.post(postId), (post) =>
        post ? { ...post, commentCount: Math.max(post.commentCount - 1, 0) } : post,
      );
    },

    onSuccess: (created, _input, context) => {
      client.setQueryData<Page<Comment>>(key, (page) => {
        if (!page) return { items: [created], nextCursor: null };
        return {
          ...page,
          items: page.items.map((item) => (item.id === context?.tempId ? created : item)),
        };
      });
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

/** Um comentario ainda em voo, pra UI poder marcar como "enviando". */
export const isPending = (comment: Comment): boolean => comment.id.startsWith('pendente-');
