'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import type { User, SignInRequest } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (credentials: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
    } catch (error: any) {
      // Only clear tokens if it's an auth error (401/403), not network errors
      // Network errors will be handled by the UI
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setUser(null);
        apiClient.clearTokens();
      } else {
        // For network errors, keep tokens but don't set user
        // This allows retry without clearing auth state
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is authenticated on mount
    refreshUser();
  }, []);

  const signIn = async (credentials: SignInRequest) => {
    await apiClient.signIn(credentials);
    await refreshUser();
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem('refresh_token') || undefined;
    await apiClient.signOut(refreshToken);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


