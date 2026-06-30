import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authApi, tokenStore, User, LoginPayload, RegisterPayload } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(tokenStore.getUser());
  const [token, setToken] = useState<string | null>(tokenStore.get());
  const [loading, setLoading] = useState(false);

  // Verify token on mount
  useEffect(() => {
    if (token && !user) {
      authApi.me()
        .then(res => {
          const u = res.data;
          setUser(u);
          tokenStore.setUser(u);
        })
        .catch(() => {
          tokenStore.remove();
          setToken(null);
          setUser(null);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (data: LoginPayload) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { access_token, user: u } = res.data;
      tokenStore.set(access_token);
      tokenStore.setUser(u);
      setToken(access_token);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      const { access_token, user: u } = res.data;
      tokenStore.set(access_token);
      tokenStore.setUser(u);
      setToken(access_token);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.remove();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
