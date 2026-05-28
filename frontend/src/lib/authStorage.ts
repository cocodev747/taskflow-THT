import { config } from "./config";
import type { User } from "../api/types";

type StoredAuth = {
  token: string;
  user: User | null;
};

const userKey = "taskflow_user";

export function getToken() {
  return localStorage.getItem(config.tokenKey);
}

export function loadAuth(): StoredAuth | null {
  const token = getToken();
  if (!token) {
    return null;
  }

  const rawUser = localStorage.getItem(userKey);
  if (!rawUser) {
    return { token, user: null };
  }

  try {
    return { token, user: JSON.parse(rawUser) as User };
  } catch {
    return { token, user: null };
  }
}

export function saveAuth(token: string, user: User) {
  localStorage.setItem(config.tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(config.tokenKey);
  localStorage.removeItem(userKey);
}

export function notifyAuthLogout() {
  window.dispatchEvent(new Event("auth:logout"));
}
