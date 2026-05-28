import { clearAuth, getToken, notifyAuthLogout } from "../lib/authStorage";
import { ApiError } from "../lib/apiError";
import { config } from "../lib/config";

async function readErrorMessage(response: Response) {
  const fallback = `Request failed (${response.status})`;

  try {
    const body = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      return String((body as { message: string }).message);
    }
  } catch {
    // not json
  }

  if (response.status === 401) return "Please sign in again.";
  if (response.status === 403) return "You don't have access to do that.";
  if (response.status === 404) return "That item was not found.";
  if (response.status === 409) return "That record already exists.";
  if (response.status >= 500) return "Server error. Try again in a moment.";

  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new ApiError("Can't reach the API. Is the backend running?", 0);
  }

  if (response.status === 401 && token) {
    clearAuth();
    notifyAuthLogout();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
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
