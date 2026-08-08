'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserInfo, fetchCurrentUser, getAccessToken, logout as apiLogout } from '@/lib/api/auth';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userInfo: UserInfo) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (newUserInfo: Partial<UserInfo>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const fetchedUser = await fetchCurrentUser();
    if (fetchedUser) {
      setUser(fetchedUser);
    }
  };

  const updateUser = (newUserInfo: Partial<UserInfo>) => {
    setUser(prev => prev ? { ...prev, ...newUserInfo } : null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        // Fetch real user data from backend to prevent localStorage tampering
        const fetchedUser = await fetchCurrentUser();
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          // Token invalid or expired
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (userInfo: UserInfo) => {
    setUser(userInfo);
  };

  const logout = () => {
    apiLogout();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

