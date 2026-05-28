import { Link } from "react-router-dom";
import { getToken } from "../api/client";

export default function HomePage() {
  const isLoggedIn = Boolean(getToken());

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome</h1>
      <p className="mt-2 text-sm text-slate-600">
        Simple task manager MVP. Sign in and start tracking your work.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to={isLoggedIn ? "/tasks" : "/login"}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {isLoggedIn ? "Go to tasks" : "Sign in"}
        </Link>
      </div>
    </section>
  );
}
