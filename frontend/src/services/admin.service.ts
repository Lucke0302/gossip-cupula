import { z } from 'zod';
import { request } from '../lib/http';

/* ------------------------------------------------------------------ *
 * Painel de administração.
 *
 * Fala direto com /api/admin, sem tradução: ao contrário dos posts, aqui
 * o dado É a identidade das pessoas — nome, e-mail e estado da conta são
 * exatamente o que o Admin precisa ver para decidir. Nada disso se cruza
 * com post ou comentário em lugar nenhum.
 *
 * Todas as rotas exigem role "Admin" no token. Quem não for leva 403 do
 * servidor — o esconde-esconde no front é conveniência, não segurança.
 * ------------------------------------------------------------------ */

export const adminUserSchema = z
  .object({
    id: z.string().uuid(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
    isEmailConfirmed: z.boolean(),
    isApprovedByAdmin: z.boolean(),
    createdAt: z.string(),
  })
  .strict();

export const adminUserListSchema = z.array(adminUserSchema);

export type AdminUser = z.infer<typeof adminUserSchema>;

const voidSchema = z.undefined();

export function listUsers(signal?: AbortSignal): Promise<AdminUser[]> {
  return request('/admin/users', { schema: adminUserListSchema, signal });
}

export function approveUser(id: string): Promise<undefined> {
  return request(`/admin/users/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    schema: voidSchema,
  });
}

export function revokeUser(id: string): Promise<undefined> {
  return request(`/admin/users/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    schema: voidSchema,
  });
}

/** Irreversível: apaga o usuário e os votos dele. Os posts ficam. */
export function deleteUser(id: string): Promise<undefined> {
  return request(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: voidSchema,
  });
}
