import { clearAuth, getToken, notifyAuthLogout } from "../lib/authStorage";
import { config } from "../lib/config";

type ApiError = {
  message: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && token) {
    clearAuth();
    notifyAuthLogout();
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body)
    }),
  delete: (path: string) => request<void>(path, { method: "DELETE" })
};
