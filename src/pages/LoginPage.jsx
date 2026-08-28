import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginForm from "../components/auth/LoginForm";

export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Already logged in (e.g. user typed /login manually) -> bounce home.
  if (isAuthenticated) return <Navigate to={from} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-3xl bg-cream-card p-6 shadow-soft animate-fade-up">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">Masuk ke BulkyApp</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Login diperlukan untuk melihat dashboard, riwayat, dan target kamu.
          </p>
        </div>
        <LoginForm onSuccess={() => navigate(from, { replace: true })} />
      </div>
    </div>
  );
}
