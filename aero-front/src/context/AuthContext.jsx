import React, { createContext, useContext, useState, useCallback } from 'react';
import { tokenStore, logout as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => tokenStore.getToken());
  const [user,  setUser]    = useState(() => tokenStore.getUser());

  const login = useCallback((tokenStr, refreshToken, uzytkownik) => {
    tokenStore.set(tokenStr, refreshToken, uzytkownik);
    setToken(tokenStr);
    setUser(uzytkownik);
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh();
    if (refresh) {
      // Odwołaj refresh token na serwerze (fire-and-forget)
      await apiLogout(refresh);
    }
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  const isLoggedIn = Boolean(token);

  // Rola z tokena
  const rola = user?.rolaNazwa ?? '';

  const hasRole = (...roles) => roles.includes(rola);

  return (
    <AuthContext.Provider value={{ token, user, isLoggedIn, rola, hasRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
