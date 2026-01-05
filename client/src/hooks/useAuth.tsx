import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { SessionUser } from "@shared/schema";

interface AuthState {
  authenticated: boolean;
  user: SessionUser | null;
  activeWebsiteId: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectWebsite: (websiteId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    activeWebsiteId: null,
    loading: true,
  });
  const [, navigate] = useLocation();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const data = await res.json();
      
      if (data.authenticated && data.user) {
        setState({
          authenticated: true,
          user: data.user,
          activeWebsiteId: data.active_website_id || null,
          loading: false,
        });
      } else {
        setState({
          authenticated: false,
          user: null,
          activeWebsiteId: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error("[Auth] Session check failed:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (data.success && data.user) {
        setState({
          authenticated: true,
          user: data.user,
          activeWebsiteId: data.user.default_website_id || null,
          loading: false,
        });
        return { success: true };
      }
      
      return { success: false, error: data.error || "Login failed" };
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      return { success: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("[Auth] Logout failed:", error);
    }
    
    setState({
      authenticated: false,
      user: null,
      activeWebsiteId: null,
      loading: false,
    });
    navigate("/login");
  }, [navigate]);

  const selectWebsite = useCallback(async (websiteId: string) => {
    try {
      const res = await fetch("/api/websites/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ website_id: websiteId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setState(prev => ({ ...prev, activeWebsiteId: websiteId }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("[Auth] Select website failed:", error);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, selectWebsite, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!auth.loading && !auth.authenticated) {
      navigate("/login");
    }
  }, [auth.loading, auth.authenticated, navigate]);

  return auth;
}
