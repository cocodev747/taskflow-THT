import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, setToken } from "../api/client";
import type { AuthResult } from "../api/types";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const auth = useMutation({
    mutationFn: (payload: { email: string; password: string }) => {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      return api.post<AuthResult>(path, payload);
    },
    onSuccess: (result) => {
      setToken(result.token);
      navigate("/tasks");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    }
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    auth.mutate({ email, password });
  }

  return (
    <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={auth.isPending}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {auth.isPending ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
        className="mt-4 text-sm text-slate-600 hover:text-slate-900"
      >
        {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
      </button>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
