import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
 * O access token vive AQUI, num ref — memoria pura. Nunca localStorage,
 * nunca sessionStorage, nunca cookie legivel por JS. Se a aba fechar,
 * ele some; quem devolve a sessao no boot e' o refresh token, que mora
 * num cookie httpOnly + Secure e o JS nem enxerga.
 *
 * O `nickname` daqui e' so pra pessoa saber que esta logada. Ele nao
 * acompanha nenhum post nem comentario, em lugar nenhum.
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

/** Renova um minuto antes de expirar, pra ninguem tomar 401 no meio de um clique. */
const RENEW_MARGIN_S = 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(null);
  const renewTimer = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>('booting');
  const [profile, setProfile] = useState<{ nickname: string; role: 'user' | 'admin' } | null>(null);

  const clearRenew = useCallback(() => {
    if (renewTimer.current !== null) {
      window.clearTimeout(renewTimer.current);
      renewTimer.current = null;
    }
  }, []);

  const dropSession = useCallback(() => {
    tokenRef.current = null;
    clearRenew();
    setProfile(null);
    setStatus('anonymous');
    // Cache de dados privados nao sobrevive a queda de sessao.
    queryClient.clear();
  }, [clearRenew]);

  // Referencia propria para o timer poder se reagendar depois de renovar.
  const scheduleRenewRef = useRef<(expiresIn: number) => void>(() => {});

  const scheduleRenew = useCallback(
    (expiresIn: number) => {
      clearRenew();
      const delay = Math.max((expiresIn - RENEW_MARGIN_S) * 1000, 15_000);
      renewTimer.current = window.setTimeout(() => {
        // Refresh silencioso; o proprio client HTTP cuida da fila.
        void authService
          .bootstrapSession()
          .then((renewed) => {
            tokenRef.current = renewed.accessToken;
            scheduleRenewRef.current(renewed.expiresIn);
          })
          .catch(() => dropSession());
      }, delay);
    },
    [clearRenew, dropSession],
  );

  scheduleRenewRef.current = scheduleRenew;

  // Registrado no primeiro render (antes de qualquer efeito disparar
  // requisicao), pra nenhuma chamada sair sem Authorization.
  useState(() => {
    configureHttp({
      getAccessToken: () => tokenRef.current,
      onTokenRefreshed: (accessToken, expiresIn) => {
        tokenRef.current = accessToken;
        scheduleRenew(expiresIn);
      },
      onSessionLost: () => dropSession(),
    });
    return null;
  });

  const adopt = useCallback(
    (session: Session) => {
      tokenRef.current = session.accessToken;
      setProfile({ nickname: session.nickname, role: session.role });
      setStatus('authenticated');
      scheduleRenew(session.expiresIn);
    },
    [scheduleRenew],
  );

  // Boot: existe cookie de refresh valido? Entao a sessao volta sozinha.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const refreshed = await authService.bootstrapSession();
        if (cancelled) return;
        tokenRef.current = refreshed.accessToken;
        const who = await authService.me();
        if (cancelled) return;
        setProfile(who);
        setStatus('authenticated');
        scheduleRenew(refreshed.expiresIn);
      } catch {
        if (!cancelled) {
          tokenRef.current = null;
          setStatus('anonymous');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scheduleRenew]);

  useEffect(() => clearRenew, [clearRenew]);

  const login = useCallback(
    async (input: LoginInput) => {
      adopt(await authService.login(input));
    },
    [adopt],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      adopt(await authService.register(input));
    },
    [adopt],
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
