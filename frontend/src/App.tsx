import { FormEvent, useEffect, useMemo, useState } from "react";

type TaskItem = {
  id: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  userId: number;
};

type UserInfo = {
  id: number;
  email: string;
};

type AuthResponse = {
  token: string;
  user: UserInfo;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5068";
const tokenKey = "taskflow_token";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(tokenKey);
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers,
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: string }).message)
        : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingCount = useMemo(() => tasks.filter((task) => !task.isCompleted).length, [tasks]);
  const isAuthenticated = Boolean(user);

  async function loadTasks() {
    const data = await request<TaskItem[]>("/api/tasks");
    setTasks(data);
  }

  async function restoreSession() {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const me = await request<UserInfo>("/api/auth/me");
      setUser(me);
      await loadTasks();
    } catch {
      localStorage.removeItem(tokenKey);
      setUser(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    restoreSession();
  }, []);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const auth = await request<AuthResponse>(path, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem(tokenKey, auth.token);
      setUser(auth.user);
      setPassword("");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(tokenKey);
    setUser(null);
    setTasks([]);
    setError(null);
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setError(null);
      const created = await request<TaskItem>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: newTitle })
      });
      setTasks((current) => [created, ...current]);
      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    }
  }

  async function toggleTask(task: TaskItem) {
    try {
      setError(null);
      const updated = await request<TaskItem>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isCompleted: !task.isCompleted })
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task.");
    }
  }

  async function deleteTask(taskId: number) {
    try {
      setError(null);
      await request<void>(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Taskflow</h1>
          <p className="mt-1 text-sm text-slate-600">
            {authMode === "login" ? "Sign in to manage your tasks" : "Create an account"}
          </p>

          <form onSubmit={handleAuth} className="mt-6 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Register"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setAuthMode((mode) => (mode === "login" ? "register" : "login"))}
            className="mt-4 text-sm text-slate-600 hover:text-slate-900"
          >
            {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
          </button>

          {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Taskflow</h1>
            <p className="mt-1 text-sm text-slate-600">
              {remainingCount} remaining of {tasks.length} tasks
            </p>
            <p className="mt-1 text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
        </header>

        <form onSubmit={handleCreateTask} className="mb-6 flex gap-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Add a task"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add
          </button>
        </form>

        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {loading ? (
          <p className="text-sm text-slate-600">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-600">No tasks yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
              >
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => toggleTask(task)}
                    className="h-4 w-4"
                  />
                  <span className={task.isCompleted ? "text-slate-400 line-through" : "text-slate-800"}>
                    {task.title}
                  </span>
                </label>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
