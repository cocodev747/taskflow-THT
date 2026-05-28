import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Task } from "../api/types";

type Filter = "all" | "active" | "completed";

type TaskInput = {
  title: string;
  description: string;
  dueDate: string;
};

const emptyForm: TaskInput = { title: "", description: "", dueDate: "" };

export default function TasksPage() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Filter>("all");
  const [createForm, setCreateForm] = useState<TaskInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskInput>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks")
  });

  function refreshTasks(updated?: Task) {
    if (updated) {
      queryClient.setQueryData<Task[]>(["tasks"], (current) => {
        const list = current ?? [];
        const exists = list.some((t) => t.id === updated.id);
        if (exists) {
          return list.map((t) => (t.id === updated.id ? updated : t));
        }
        return [updated, ...list];
      });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const createTask = useMutation({
    mutationFn: (input: TaskInput) =>
      api.post<Task>("/api/tasks", {
        title: input.title,
        description: input.description || null,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null
      }),
    onSuccess: (task) => {
      refreshTasks(task);
      setCreateForm(emptyForm);
      setFormError(null);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Could not create task.")
  });

  const updateTask = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TaskInput }) =>
      api.patch<Task>(`/api/tasks/${id}`, {
        title: input.title,
        description: input.description || null,
        dueDate: input.dueDate ? new Date(input.dueDate).toISOString() : null,
        dueDateChanged: true
      }),
    onSuccess: (task) => {
      refreshTasks(task);
      setEditingId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Could not update task.")
  });

  const toggleTask = useMutation({
    mutationFn: (id: number) => api.patch<Task>(`/api/tasks/${id}/toggle`),
    onSuccess: (task) => refreshTasks(task),
    onError: (err) => setFormError(err instanceof Error ? err.message : "Could not update task.")
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Task[]>(["tasks"], (current) =>
        (current ?? []).filter((t) => t.id !== id)
      );
      setDeleteId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Could not delete task.")
  });

  const tasks = tasksQuery.data ?? [];

  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((t) => !t.isCompleted);
    if (filter === "completed") return tasks.filter((t) => t.isCompleted);
    return tasks;
  }, [tasks, filter]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => !t.isCompleted).length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { active, completed, overdue, total: tasks.length };
  }, [tasks]);

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: toDateInputValue(task.dueDate)
    });
    setFormError(null);
  }

  function onCreateSubmit(event: FormEvent) {
    event.preventDefault();
    if (!createForm.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    createTask.mutate({
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      dueDate: createForm.dueDate
    });
  }

  function onEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingId) return;
    if (!editForm.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    updateTask.mutate({
      id: editingId,
      input: {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate
      }
    });
  }

  const isBusy =
    createTask.isPending || updateTask.isPending || toggleTask.isPending || deleteTask.isPending;

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
        <p className="mt-1 text-sm text-slate-600">
          {stats.active} active · {stats.completed} completed
          {stats.overdue > 0 && (
            <span className="ml-2 text-red-600">{stats.overdue} overdue</span>
          )}
        </p>
      </header>

      {/* create */}
      <form onSubmit={onCreateSubmit} className="mb-6 space-y-3 rounded-md border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-800">New task</p>
        <input
          value={createForm.title}
          onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          value={createForm.description}
          onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Due date{" "}
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={createTask.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {createTask.isPending ? "Adding..." : "Add task"}
          </button>
        </div>
      </form>

      {/* filters */}
      <div className="mb-4 flex gap-2">
        {(["all", "active", "completed"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              filter === value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {formError && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>
      )}

      {/* list states */}
      {tasksQuery.isLoading ? (
        <div className="space-y-2">
          <div className="h-14 animate-pulse rounded-md bg-slate-100" />
          <div className="h-14 animate-pulse rounded-md bg-slate-100" />
          <div className="h-14 animate-pulse rounded-md bg-slate-100" />
        </div>
      ) : tasksQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load tasks.{" "}
          <button
            type="button"
            onClick={() => tasksQuery.refetch()}
            className="font-medium underline"
          >
            Try again
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm font-medium text-slate-800">No tasks yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first task above to get started.</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          No {filter} tasks right now.
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredTasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-md border px-3 py-3 ${
                isOverdue(task) ? "border-red-200 bg-red-50/40" : "border-slate-200"
              }`}
            >
              {editingId === task.id ? (
                <form onSubmit={onEditSubmit} className="space-y-3">
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updateTask.isPending}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                    >
                      {updateTask.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <label className="flex flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      disabled={isBusy}
                      onChange={() => toggleTask.mutate(task.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          task.isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <p
                          className={`mt-1 text-xs ${
                            isOverdue(task) ? "font-medium text-red-600" : "text-slate-500"
                          }`}
                        >
                          Due {formatDueDate(task.dueDate)}
                          {isOverdue(task) && " · Overdue"}
                        </p>
                      )}
                    </div>
                  </label>

                  <div className="flex shrink-0 gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => startEdit(task)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900">Delete task?</h2>
            <p className="mt-2 text-sm text-slate-600">This cannot be undone.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTask.isPending}
                onClick={() => deleteTask.mutate(deleteId)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteTask.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function formatDueDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.isCompleted) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}
