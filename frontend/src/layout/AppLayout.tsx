import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            Taskflow
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user && (
              <Link to="/tasks" className="text-slate-700 hover:text-slate-900">
                Tasks
              </Link>
            )}
            {user ? (
              <>
                <span className="text-slate-500">{user.email}</span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-700 hover:text-slate-900">
                  Login
                </Link>
                <Link to="/register" className="text-slate-700 hover:text-slate-900">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
