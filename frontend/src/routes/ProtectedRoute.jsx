import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While AuthContext is restoring the session from the token,
  // render nothing. This prevents a flash-redirect to /login on page reload.
  if (loading) return null;

  // Not logged in — redirect to the appropriate login page
  if (!user) {
    const loginPath = role === "manager" || role === "admin"
      ? "/staff/login"
      : "/login";
    return (
      <Navigate
        to={loginPath}
        state={{ message: "You need to log in to access this page.", from: location.pathname }}
        replace
      />
    );
  }

  // Logged in but wrong role — redirect to their own dashboard
  if (role && user.role !== role) {
    const redirectTo =
      user.role === "customer" ? "/dashboard"
      : user.role === "manager" ? "/manager"
      : "/admin";
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
