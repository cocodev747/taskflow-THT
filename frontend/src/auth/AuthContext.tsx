import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { clearAuth, loadAuth, saveAuth } from "../lib/authStorage";
import { config } from "../lib/config";
import type { AuthResult, User } from "../api/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const stored = loadAuth();
      if (!stored) {
        setLoading(false);
        return;
      }

      if (stored.user) {
        setUser(stored.user);
      }

      try {
        const me = await api.get<User>("/api/auth/me");
        setUser(me);
        saveAuth(stored.token, me);
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === config.tokenKey && !event.newValue) {
        setUser(null);
        queryClient.clear();
      }
    }

    function onAuthLogout() {
      setUser(null);
      queryClient.clear();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:logout", onAuthLogout);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:logout", onAuthLogout);
    };
  }, [queryClient]);

  async function login(email: string, password: string) {
    const result = await api.post<AuthResult>("/api/auth/login", { email, password });
    saveAuth(result.token, result.user);
    setUser(result.user);
    queryClient.invalidateQueries();
  }

  async function register(email: string, password: string) {
    const result = await api.post<AuthResult>("/api/auth/register", { email, password });
    saveAuth(result.token, result.user);
    setUser(result.user);
    queryClient.invalidateQueries();
  }

  function logout() {
    clearAuth();
    setUser(null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
