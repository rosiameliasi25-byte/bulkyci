import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";

/**
 * Menentukan halaman pertama yang dilihat pengguna di root path "/":
 * - Belum login            -> /login
 * - Sudah login, belum pernah isi onboarding -> /onboarding
 * - Sudah login, sudah pernah isi onboarding -> /dashboard
 */
export default function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const { onboarded } = useApp();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={onboarded ? "/dashboard" : "/onboarding"} replace />;
}
