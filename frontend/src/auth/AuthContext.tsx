import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, clearToken, getToken, setToken } from "../api/client";
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
    async function loadSession() {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const me = await api.get<User>("/api/auth/me");
        setUser(me);
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  async function login(email: string, password: string) {
    const result = await api.post<AuthResult>("/api/auth/login", { email, password });
    setToken(result.token);
    setUser(result.user);
    queryClient.invalidateQueries();
  }

  async function register(email: string, password: string) {
    const result = await api.post<AuthResult>("/api/auth/register", { email, password });
    setToken(result.token);
    setUser(result.user);
    queryClient.invalidateQueries();
  }

  function logout() {
    clearToken();
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
