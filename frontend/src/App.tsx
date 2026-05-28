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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5068";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const remainingCount = useMemo(() => tasks.filter((task) => !task.isCompleted).length, [tasks]);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);
      const data = await request<TaskItem[]>("/api/tasks");
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await request<TaskItem>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: newTitle, userId: 1 })
      });
      setTasks((current) => [created, ...current]);
      setNewTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task.");
    }
  }

  async function toggleTask(task: TaskItem) {
    try {
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
      await request<void>(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Taskflow</h1>
          <p className="mt-1 text-sm text-slate-600">
            {remainingCount} remaining of {tasks.length} tasks
          </p>
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
