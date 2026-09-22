import { z } from 'zod';
import { request } from '../lib/http';
import { sessionSchema, type LoginInput, type RegisterInput, type Session } from '../types';

/* ------------------------------------------------------------------ *
 * Toda a conversa com /auth passa por aqui — e nenhuma dessas funcoes
 * devolve token, porque token nao chega ate' o navegador. Quem recebe os
 * tokens da API e' o proxy-com-sessao, que os guarda num cookie HttpOnly
 * e devolve pra ca' so' o que a interface precisa: quem voce e'.
 * ------------------------------------------------------------------ */

const voidSchema = z.undefined();

/**
 * Entra.
 *
 * A API aceita usuario OU e-mail no mesmo campo (`identifier`), entao o
 * apelido que a pessoa digita na tela serve para os dois casos.
 */
export function login(input: LoginInput): Promise<Session> {
  return request('/auth/login', {
    method: 'POST',
    body: {
      identifier: input.nickname.trim(),
      password: input.password,
    },
    schema: sessionSchema,
    skipSessionDrop: true,
  });
}

export function register(input: RegisterInput): Promise<Session> {
  return request('/auth/register', {
    method: 'POST',
    body: {
      username: input.nickname.trim(),
      email: input.email.trim(),
      password: input.password,
    },
    schema: sessionSchema,
    skipSessionDrop: true,
  });
}

/**
 * Quem esta logado, segundo o cookie de sessao.
 *
 * E' isso que devolve a sessao depois de um F5: o cookie sobrevive ao
 * recarregamento e o proxy responde sem exigir login de novo.
 */
export function me(): Promise<Session> {
  return request('/auth/session', {
    schema: sessionSchema,
    skipSessionDrop: true,
  });
}

/**
 * Confirma o e-mail do cadastro.
 *
 * Rota publica: quem clica no link de confirmacao ainda nao tem sessao.
 *
 * Aviso de contrato: hoje a API aceita so' o e-mail, sem token nenhum —
 * ou seja, qualquer um confirma o e-mail de qualquer um, e nenhum e-mail
 * e' realmente enviado. Esta' anotado no README como pendencia do
 * servidor; do lado de ca' nao da' pra consertar.
 */
export function confirmEmail(email: string): Promise<{ message: string }> {
  return request('/auth/confirm-email', {
    method: 'POST',
    body: { email: email.trim() },
    schema: z.object({ message: z.string() }).strict(),
    skipSessionDrop: true,
  });
}

export function logout(): Promise<undefined> {
  return request('/auth/logout', {
    method: 'POST',
    schema: voidSchema,
    skipSessionDrop: true,
  });
}
