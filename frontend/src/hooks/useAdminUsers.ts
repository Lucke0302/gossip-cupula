import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveUser,
  deleteUser,
  listUsers,
  revokeUser,
  type AdminUser,
} from '../services/admin.service';

const adminUsersKey = ['admin', 'users'] as const;

export function useAdminUsers(enabled: boolean) {
  return useQuery<AdminUser[], Error>({
    queryKey: adminUsersKey,
    queryFn: ({ signal }) => listUsers(signal),
    enabled,
    // Aprovação é decisão de agora: nada de servir lista velha do cache.
    staleTime: 0,
  });
}

type Acao = 'approve' | 'revoke' | 'delete';

const executar: Record<Acao, (id: string) => Promise<undefined>> = {
  approve: approveUser,
  revoke: revokeUser,
  delete: deleteUser,
};

/**
 * Aprovar, revogar ou excluir.
 *
 * Sem atualização otimista de propósito: são ações com consequência real
 * (excluir é irreversível), então a lista só muda depois que o servidor
 * confirma. Mostrar "aprovado" antes da hora seria mentira cara.
 */
export function useAdminAction() {
  const client = useQueryClient();

  return useMutation<undefined, Error, { id: string; acao: Acao }>({
    mutationFn: ({ id, acao }) => executar[acao](id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminUsersKey });
    },
  });
}
