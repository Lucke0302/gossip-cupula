import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { configureHttp } from '../lib/http';
import { queryClient } from '../lib/queryClient';
import * as authService from '../services/auth.service';
import type { LoginInput, RegisterInput, Session } from '../types';

/* ------------------------------------------------------------------ *
 * Sessao.
 *
 * Este contexto nao guarda token nenhum — nem em memoria, nem em
 * storage, nem em cookie legivel. Os tokens da API vivem num cookie
 * HttpOnly escrito pelo proxy (server/session-proxy.ts), fora do alcance
 * do JavaScript. Aqui fica so' quem esta logado, pra interface saber o
 * que mostrar.
 *
 * Como o cookie sobrevive ao recarregamento, o boot e' uma pergunta
 * simples: "quem sou eu?" (GET /auth/session). Se o cookie estiver la',
 * a sessao volta; se nao, a pessoa e' anonima.
 * ------------------------------------------------------------------ */

type Status = 'booting' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: Status;
  nickname: string | null;
  role: 'user' | 'admin' | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('booting');
  const [profile, setProfile] = useState<Session | null>(null);

  const dropSession = useCallback(() => {
    setProfile(null);
    setStatus('anonymous');
    // Cache de dados privados nao sobrevive a queda de sessao.
    queryClient.clear();
  }, []);

  // Registrado no primeiro render, antes de qualquer efeito disparar
  // requisicao, pra nenhum 401 passar despercebido.
  useState(() => {
    configureHttp({ onUnauthorized: () => dropSession() });
    return null;
  });

  const adopt = useCallback((session: Session) => {
    setProfile(session);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    let cancelled = false;

    void authService
      .me()
      .then((session) => {
        if (!cancelled) adopt(session);
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, [adopt]);

  const login = useCallback(
    async (input: LoginInput) => {
      adopt(await authService.login(input));
    },
    [adopt],
  );

  /**
   * Cadastra — e NAO entra.
   *
   * A API devolve um token no register, mas o login so' libera depois de
   * e-mail confirmado E aprovacao de admin. Aproveitar esse token pra
   * deixar a pessoa navegando seria mentira de curto prazo: na proxima
   * visita ela levaria "aguardando aprovacao" sem entender por que.
   * Entao a sessao recem-criada e' descartada na hora e a tela manda pro
   * aviso de conta pendente.
   */
  const register = useCallback(
    async (input: RegisterInput) => {
      await authService.register(input);
      try {
        await authService.logout();
      } finally {
        dropSession();
      }
    },
    [dropSession],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      dropSession();
    }
  }, [dropSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      nickname: profile?.nickname ?? null,
      role: profile?.role ?? null,
      isAuthenticated: status === 'authenticated',
      login,
      register,
      logout,
    }),
    [status, profile, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return context;
}
