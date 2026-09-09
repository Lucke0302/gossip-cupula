import { z } from 'zod';
import { request } from '../lib/http';
import { sessionSchema, type LoginInput, type RegisterInput, type Session } from '../types';

/* Toda a conversa com /auth passa por aqui. Nenhuma tela chama fetch. */

const voidSchema = z.undefined();

/**
 * Entra. O backend responde com o access token (curto, fica so em
 * memoria) e seta o refresh token num cookie httpOnly + Secure — que o
 * JS nunca le, por isso ele nao aparece em lugar nenhum deste arquivo.
 */
export function login(input: LoginInput): Promise<Session> {
  return request('/auth/login', {
    method: 'POST',
    body: {
      nickname: input.nickname.trim().toLowerCase(),
      password: input.password,
      remember: input.remember,
    },
    schema: sessionSchema,
    skipAuthRetry: true,
  });
}

export function register(input: RegisterInput): Promise<Session> {
  return request('/auth/register', {
    method: 'POST',
    body: {
      nickname: input.nickname.trim().toLowerCase(),
      inviteCode: input.inviteCode.trim().toUpperCase(),
      password: input.password,
    },
    schema: sessionSchema,
    skipAuthRetry: true,
  });
}

/**
 * Tenta ressuscitar a sessao no boot usando so o cookie de refresh.
 * E por isso que recarregar a pagina nao derruba ninguem, mesmo com o
 * access token vivendo apenas em memoria.
 */
export function bootstrapSession(): Promise<Omit<Session, 'accessToken' | 'expiresIn'> & {
  accessToken: string;
  expiresIn: number;
}> {
  return request('/auth/refresh', {
    method: 'POST',
    schema: z
      .object({ accessToken: z.string().min(10), expiresIn: z.number().int().positive() })
      .strict()
      .transform((data) => ({ ...data, nickname: '', role: 'user' as const })),
    skipAuthRetry: true,
  });
}

export function me(): Promise<{ nickname: string; role: 'user' | 'admin' }> {
  return request('/auth/session', {
    schema: z.object({ nickname: z.string(), role: z.enum(['user', 'admin']) }).strict(),
    skipAuthRetry: true,
  });
}

export function logout(): Promise<undefined> {
  return request('/auth/logout', {
    method: 'POST',
    schema: voidSchema,
    skipAuthRetry: true,
  });
}
