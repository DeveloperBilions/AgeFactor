'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth as authApi } from '@/lib/api';

interface User {
  id: string;
  phone: string;
  name: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'longhealth_auth';

function getStoredAuth(): { accessToken: string; refreshToken: string; user: User } | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeAuth(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, refreshToken, user }));
}

function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setState({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, user: User) => {
    storeAuth(accessToken, refreshToken, user);
    setState({
      user,
      accessToken,
      refreshToken,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      if (state.accessToken) {
        await authApi.logout(state.accessToken, state.refreshToken || undefined);
      }
    } catch {
      // Ignore logout API errors
    }
    clearStoredAuth();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [state.accessToken, state.refreshToken]);

  const updateUser = useCallback((user: User) => {
    setState(s => {
      if (s.accessToken && s.refreshToken) {
        storeAuth(s.accessToken, s.refreshToken, user);
      }
      return { ...s, user };
    });
  }, []);

  const getToken = useCallback(() => state.accessToken, [state.accessToken]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
