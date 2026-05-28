import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Spinner from "../ui/Spinner";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="rounded-lg bg-white p-8 shadow-sm">
        <Spinner label="Loading..." />
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome</h1>
      <p className="mt-2 text-sm text-slate-600">
        Simple task manager MVP. Sign in and start tracking your work.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to={user ? "/tasks" : "/login"}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {user ? "Go to tasks" : "Sign in"}
        </Link>
        {!user && (
          <Link
            to="/register"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Register
          </Link>
        )}
      </div>
    </section>
  );
}
