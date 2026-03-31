import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'loty_token';
const USER_KEY  = 'loty_user';

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,  setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });

  const login = useCallback((tokenStr, uzytkownik) => {
    localStorage.setItem(TOKEN_KEY, tokenStr);
    localStorage.setItem(USER_KEY, JSON.stringify(uzytkownik));
    setToken(tokenStr);
    setUser(uzytkownik);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
