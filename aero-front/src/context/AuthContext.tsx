import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenStore, logout as apiLogout, AUTH_EXPIRED_EVENT } from '../services/api';
import type { UzytkownikDto } from '../types/api';

interface AuthContextValue {
  token: string | null;
  user: UzytkownikDto | null;
  isLoggedIn: boolean;
  rola: string;
  hasRole: (...roles: string[]) => boolean;
  login: (token: string, refreshToken: string, uzytkownik: UzytkownikDto) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => tokenStore.getToken());
  const [user, setUser]   = useState<UzytkownikDto | null>(() => tokenStore.getUser());

  const login = useCallback((tokenStr: string, refreshToken: string, uzytkownik: UzytkownikDto) => {
    tokenStore.set(tokenStr, refreshToken, uzytkownik);
    setToken(tokenStr);
    setUser(uzytkownik);
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      await apiLogout(refresh);
    }
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  // Listen for auth expiry events from the API interceptor
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  const isLoggedIn = Boolean(token);
  const rola = user?.rolaNazwa ?? '';
  const hasRole = useCallback((...roles: string[]) => roles.includes(rola), [rola]);

  return (
    <AuthContext.Provider value={{ token, user, isLoggedIn, rola, hasRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
