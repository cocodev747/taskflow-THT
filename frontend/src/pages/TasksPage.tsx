import { FormEvent, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "../api/client";
import type { Task } from "../api/types";

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hasToken = Boolean(getToken());

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks"),
    enabled: hasToken
  });

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  const createTask = useMutation({
    mutationFn: (newTitle: string) => api.post<Task>("/api/tasks", { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not create task.")
  });

  const toggleTask = useMutation({
    mutationFn: (id: number) => api.patch<Task>(`/api/tasks/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (err) => setError(err instanceof Error ? err.message : "Could not update task.")
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (err) => setError(err instanceof Error ? err.message : "Could not delete task.")
  });

  const tasks = tasksQuery.data ?? [];
  const remaining = useMemo(() => tasks.filter((t) => !t.isCompleted).length, [tasks]);

  function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(title.trim());
  }

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        <p className="mt-1 text-sm text-slate-600">
          {remaining} remaining of {tasks.length}
        </p>
      </header>

      <form onSubmit={onCreate} className="mb-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={createTask.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Add
        </button>
      </form>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {tasksQuery.isLoading ? (
        <p className="text-sm text-slate-600">Loading...</p>
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
                  onChange={() => toggleTask.mutate(task.id)}
                  className="h-4 w-4"
                />
                <span className={task.isCompleted ? "text-slate-400 line-through" : "text-slate-800"}>
                  {task.title}
                </span>
              </label>
              <button
                type="button"
                onClick={() => deleteTask.mutate(task.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
