import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Task } from "../api/types";
import { errMsg } from "../lib/apiError";
import {
  fmtDate,
  isLate,
  statusOf,
  toApiDate,
  toInputDate,
  type TaskStatus
} from "../lib/dates";
import Empty from "../ui/Empty";
import { useToast } from "../ui/Toast";

type Tab = "all" | "active" | "completed";

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
};

const blank: TaskForm = { title: "", description: "", dueDate: "" };

export default function TasksPage() {
  const qc = useQueryClient();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("all");
  const [newTask, setNewTask] = useState<TaskForm>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<TaskForm>(blank);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [newErr, setNewErr] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<Task[]>("/api/tasks")
  });

  function upsertTask(updated: Task) {
    qc.setQueryData<Task[]>(["tasks"], (list) => {
      const items = list ?? [];
      if (items.some((t) => t.id === updated.id)) {
        return items.map((t) => (t.id === updated.id ? updated : t));
      }
      return [updated, ...items];
    });
  }

  function fitsFilter(task: Task, current: Tab) {
    if (current === "active") return !task.isCompleted;
    if (current === "completed") return task.isCompleted;
    return true;
  }

  function bailEdit(task: Task) {
    if (editingId === task.id && !fitsFilter(task, tab)) {
      closeEdit();
    }
  }

  const create = useMutation({
    mutationFn: (form: TaskForm) =>
      api.post<Task>("/api/tasks", {
        title: form.title,
        description: form.description || null,
        dueDate: toApiDate(form.dueDate)
      }),
    onSuccess: (task) => {
      upsertTask(task);
      setNewTask(blank);
      setNewErr(null);
      toast.ok("Task added");
    },
    onError: (e) => toast.err(errMsg(e, "Could not create task."))
  });

  const save = useMutation({
    mutationFn: ({ id, form }: { id: number; form: TaskForm }) =>
      api.patch<Task>(`/api/tasks/${id}`, {
        title: form.title,
        description: form.description || null,
        dueDate: toApiDate(form.dueDate),
        dueDateChanged: true
      }),
    onSuccess: (task) => {
      upsertTask(task);
      closeEdit();
      toast.ok("Task saved");
    },
    onError: (e) => toast.err(errMsg(e, "Could not save changes."))
  });

  const toggle = useMutation({
    mutationFn: (id: number) => {
      setTogglingId(id);
      return api.patch<Task>(`/api/tasks/${id}/toggle`);
    },
    onSuccess: (task) => {
      upsertTask(task);
      bailEdit(task);
    },
    onError: (e) => toast.err(errMsg(e, "Could not update status.")),
    onSettled: () => setTogglingId(null)
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData<Task[]>(["tasks"], (list) => (list ?? []).filter((t) => t.id !== id));
      if (editingId === id) closeEdit();
      setDeleteId(null);
      toast.ok("Task deleted");
    },
    onError: (e) => toast.err(errMsg(e, "Could not delete task."))
  });

  const tasks = q.data ?? [];

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((t) => !t.isCompleted).length,
      completed: tasks.filter((t) => t.isCompleted).length
    }),
    [tasks]
  );

  const visible = useMemo(() => {
    let list = tasks;
    if (tab === "active") list = tasks.filter((t) => !t.isCompleted);
    if (tab === "completed") list = tasks.filter((t) => t.isCompleted);

    return [...list].sort((a, b) => {
      const aLate = isLate(a) ? 0 : 1;
      const bLate = isLate(b) ? 0 : 1;
      if (aLate !== bLate) return aLate - bLate;

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, tab]);

  const totals = useMemo(() => {
    const active = tasks.filter((t) => !t.isCompleted).length;
    const completed = tasks.filter((t) => t.isCompleted).length;
    const late = tasks.filter((t) => isLate(t)).length;
    return { active, completed, late, total: tasks.length };
  }, [tasks]);

  function openEdit(task: Task) {
    setEditingId(task.id);
    setEditDraft({
      title: task.title,
      description: task.description ?? "",
      dueDate: toInputDate(task.dueDate)
    });
    setEditErr(null);
  }

  function closeEdit() {
    setEditingId(null);
    setEditErr(null);
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) {
      setNewErr("Title is required.");
      return;
    }
    setNewErr(null);
    create.mutate({
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      dueDate: newTask.dueDate
    });
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!editDraft.title.trim()) {
      setEditErr("Title is required.");
      return;
    }
    setEditErr(null);
    save.mutate({
      id: editingId,
      form: {
        title: editDraft.title.trim(),
        description: editDraft.description.trim(),
        dueDate: editDraft.dueDate
      }
    });
  }

  const firstLoad = q.isLoading && !q.data;
  const refetching = q.isFetching && !firstLoad;

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-600">
            {totals.active} active · {totals.completed} completed
            {totals.late > 0 && (
              <span className="ml-2 font-medium text-red-600">{totals.late} overdue</span>
            )}
          </p>
        </div>
        {refetching && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            Syncing...
          </span>
        )}
      </header>

      <form
        onSubmit={handleCreate}
        className="mb-6 space-y-3 rounded-md border border-slate-200 p-4"
      >
        <p className="text-sm font-medium text-slate-800">New task</p>
        <input
          value={newTask.title}
          onChange={(e) => {
            setNewTask((f) => ({ ...f, title: e.target.value }));
            if (newErr) setNewErr(null);
          }}
          placeholder="Title"
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            newErr ? "border-red-300" : "border-slate-300"
          }`}
        />
        <textarea
          value={newTask.description}
          onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Due date{" "}
            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask((f) => ({ ...f, dueDate: e.target.value }))}
              className="ml-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          {newTask.dueDate && (
            <button
              type="button"
              onClick={() => setNewTask((f) => ({ ...f, dueDate: "" }))}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear date
            </button>
          )}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {create.isPending ? "Adding..." : "Add task"}
          </button>
        </div>
        {newErr && <p className="text-sm text-red-600">{newErr}</p>}
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "active", "completed"] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              if (editingId) {
                const row = tasks.find((t) => t.id === editingId);
                if (row && !fitsFilter(row, value)) closeEdit();
              }
            }}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              tab === value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {value} ({counts[value]})
          </button>
        ))}
      </div>

      {firstLoad ? (
        <ListSkeleton />
      ) : q.isError ? (
        <Empty
          title="Couldn't load tasks"
          hint={errMsg(q.error, "Check that the API is running and try again.")}
          icon="⚠️"
          btn="Retry"
          onBtn={() => q.refetch()}
        />
      ) : tasks.length === 0 ? (
        <Empty
          title="No tasks yet"
          hint="Add your first task with the form above — title is all you need to start."
          icon="📋"
        />
      ) : visible.length === 0 ? (
        <Empty
          title={`No ${tab} tasks`}
          hint={
            tab === "active"
              ? "You're all caught up. Peek at completed tasks or add something new."
              : tab === "completed"
                ? "Finish a task and it'll show up here."
                : "Nothing matches this filter."
          }
          btn={tab !== "all" ? "Show all" : undefined}
          onBtn={tab !== "all" ? () => setTab("all") : undefined}
        />
      ) : (
        <ul className={`space-y-2 transition-opacity ${refetching ? "opacity-60" : ""}`}>
          {visible.map((task) => {
            const status = statusOf(task);
            const busy = togglingId === task.id;

            return (
              <li
                key={task.id}
                className={`rounded-md border px-3 py-3 ${
                  status === "overdue"
                    ? "border-red-200 bg-red-50/50"
                    : status === "due-today"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-slate-200"
                } ${busy ? "opacity-60" : ""}`}
              >
                {editingId === task.id ? (
                  <form onSubmit={handleSave} className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Editing
                    </p>
                    <input
                      value={editDraft.title}
                      onChange={(e) => {
                        setEditDraft((f) => ({ ...f, title: e.target.value }));
                        if (editErr) setEditErr(null);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-sm ${
                        editErr ? "border-red-300" : "border-slate-300"
                      }`}
                      autoFocus
                    />
                    <textarea
                      value={editDraft.description}
                      onChange={(e) =>
                        setEditDraft((f) => ({ ...f, description: e.target.value }))
                      }
                      rows={2}
                      placeholder="Description"
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={editDraft.dueDate}
                        onChange={(e) =>
                          setEditDraft((f) => ({ ...f, dueDate: e.target.value }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                      {editDraft.dueDate && (
                        <button
                          type="button"
                          onClick={() => setEditDraft((f) => ({ ...f, dueDate: "" }))}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Clear date
                        </button>
                      )}
                    </div>
                    {editErr && <p className="text-sm text-red-600">{editErr}</p>}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={save.isPending}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                      >
                        {save.isPending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={closeEdit}
                        disabled={save.isPending}
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
                        disabled={busy || save.isPending}
                        onChange={() => toggle.mutate(task.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm font-medium ${
                              task.isCompleted
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </p>
                          <Tag status={status} />
                        </div>
                        {task.description && (
                          <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                        )}
                        {task.dueDate && (
                          <p
                            className={`mt-1 text-xs ${
                              status === "overdue"
                                ? "font-medium text-red-600"
                                : status === "due-today"
                                  ? "font-medium text-amber-700"
                                  : "text-slate-500"
                            }`}
                          >
                            Due {fmtDate(task.dueDate)}
                          </p>
                        )}
                        {busy && <p className="mt-1 text-xs text-slate-500">Updating...</p>}
                      </div>
                    </label>

                    <div className="flex shrink-0 gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        disabled={busy}
                        className="text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(task.id)}
                        disabled={busy}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleteId)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {remove.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading tasks">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="animate-pulse rounded-md border border-slate-200 p-4">
          <div className="flex gap-3">
            <div className="h-4 w-4 rounded bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
      <p className="pt-2 text-center text-xs text-slate-500">Loading tasks...</p>
    </div>
  );
}

function Tag({ status }: { status: TaskStatus }) {
  if (status === "active") return null;

  const cls: Record<Exclude<TaskStatus, "active">, string> = {
    completed: "bg-slate-100 text-slate-600",
    overdue: "bg-red-100 text-red-700",
    "due-today": "bg-amber-100 text-amber-800"
  };

  const text: Record<Exclude<TaskStatus, "active">, string> = {
    completed: "Done",
    overdue: "Overdue",
    "due-today": "Due today"
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls[status as Exclude<TaskStatus, "active">]}`}
    >
      {text[status as Exclude<TaskStatus, "active">]}
    </span>
  );
}
