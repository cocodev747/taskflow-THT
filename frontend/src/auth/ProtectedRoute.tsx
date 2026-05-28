import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Spinner from "../ui/Spinner";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-sm">
        <Spinner label="Checking your session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
