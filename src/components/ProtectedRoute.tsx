import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireModerator?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin, requireModerator }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isModerator } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (requireModerator && !isAdmin && !isModerator) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
