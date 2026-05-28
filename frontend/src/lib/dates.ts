import type { Task } from "../api/types";

export function fmtDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function toInputDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toApiDate(dateStr: string) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

function atMidnight(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isLate(task: Task) {
  if (!task.dueDate || task.isCompleted) return false;
  return atMidnight(new Date(task.dueDate)) < atMidnight(new Date());
}

export function isToday(task: Task) {
  if (!task.dueDate || task.isCompleted) return false;
  return atMidnight(new Date(task.dueDate)).getTime() === atMidnight(new Date()).getTime();
}

export type TaskStatus = "completed" | "overdue" | "due-today" | "active";

export function statusOf(task: Task): TaskStatus {
  if (task.isCompleted) return "completed";
  if (isLate(task)) return "overdue";
  if (isToday(task)) return "due-today";
  return "active";
}
