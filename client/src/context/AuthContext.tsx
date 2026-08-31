import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import * as authApi from '../api/auth.api';
import { tokenStore } from '../api/client';
import { LoginInput, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True while the stored token is being validated on mount. */
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [loading, setLoading] = useState(true);

  // Restore the session on mount. Without the loading flag, ProtectedRoute
  // would redirect to /login before this resolves on every refresh.
  useEffect(() => {
    const stored = tokenStore.get();
    if (!stored) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          tokenStore.clear();
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { token: newToken, user: loggedIn } = await authApi.login(input);
    tokenStore.set(newToken);
    setToken(newToken);
    setUser(loggedIn);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
