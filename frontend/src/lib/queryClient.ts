import { QueryClient } from '@tanstack/react-query';
import { ApiError, ContractError, SessionExpiredError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Contrato quebrado e sessao morta nao melhoram com retentativa.
        if (error instanceof ContractError) return false;
        if (error instanceof SessionExpiredError) return false;
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export const queryKeys = {
  posts: ['posts'] as const,
  post: (id: string) => ['post', id] as const,
  comments: (postId: string) => ['comments', postId] as const,
  photos: ['photos'] as const,
  links: ['links'] as const,
};
