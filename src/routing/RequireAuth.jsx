import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap any protected route element with <RequireAuth>...</RequireAuth>.
 *
 * - Not logged in -> redirect to /login, remembering where the user
 *   was headed (so LoginPage can send them back after a successful login).
 * - While unauthenticated, actively fights the browser Back button:
 *   every time this guard renders in a logged-out state (e.g. because
 *   the user pressed Back after logout), it re-pushes the current URL
 *   so there's nothing "behind" it to go back to, and the redirect
 *   below fires again on top of it.
 */
export default function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-200 border-t-sage-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
