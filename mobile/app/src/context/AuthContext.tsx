import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, User, AuthState } from '../types/auth';
import { sessionUtils } from '../utils/session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    sessionExpiresAt: null,
  });

  const checkSession = useCallback(async () => {
    try {
      const session = await sessionUtils.getSession();
      if (session) {
        setState({
          user: session.user,
          token: session.token,
          isLoading: false,
          sessionExpiresAt: session.expiresAt,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to check session:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const signIn = async (token: string, user: User) => {
    try {
      await sessionUtils.saveSession(token, user);
      setState({
        user,
        token,
        isLoading: false,
        sessionExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await sessionUtils.clearSession();
      setState({
        user: null,
        token: null,
        isLoading: false,
        sessionExpiresAt: null,
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Handle auto-logout on expiration
  useEffect(() => {
    if (state.sessionExpiresAt) {
      const timeout = state.sessionExpiresAt - Date.now();
      if (timeout <= 0) {
        signOut();
      } else {
        const timer = setTimeout(() => {
          signOut();
        }, timeout);
        return () => clearTimeout(timer);
      }
    }
  }, [state.sessionExpiresAt]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, checkSession }}>
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
