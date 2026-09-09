import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { createPost, getPost, listPosts } from '../services/posts.service';
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
