import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { createPost, deletePost, getPost, listPosts } from '../services/posts.service';
import type { CreatePostInput, Page, Post, PostDetail } from '../types';

/** Feed com scroll infinito por cursor opaco. */
export function usePostsFeed(enabled: boolean) {
  return useInfiniteQuery<Page<Post>, Error>({
    queryKey: queryKeys.posts,
    queryFn: ({ pageParam, signal }) => listPosts((pageParam as string | null) ?? null, signal),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
  });
}

export function usePost(id: string | undefined, enabled: boolean) {
  return useQuery<PostDetail, Error>({
    queryKey: queryKeys.post(id ?? ''),
    queryFn: ({ signal }) => getPost(id ?? '', signal),
    enabled: enabled && Boolean(id),
  });
}

/**
 * Apaga um post.
 *
 * Sem otimismo: apagar é irreversível, então a lista só muda depois que
 * o servidor confirma. Some do cache do detalhe e recarrega o feed.
 */
export function useDeletePost() {
  const client = useQueryClient();

  return useMutation<undefined, Error, string>({
    mutationFn: deletePost,
    onSuccess: (_resultado, id) => {
      client.removeQueries({ queryKey: queryKeys.post(id) });
      void client.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

export function useCreatePost() {
  const client = useQueryClient();

  return useMutation<PostDetail, Error, CreatePostInput>({
    mutationFn: createPost,
    onSuccess: (created) => {
      client.setQueryData(queryKeys.post(created.id), created);
      // O feed reordena no servidor (empates embaralhados), entao a
      // unica leitura confiavel depois de publicar e' buscar de novo.
      void client.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}
