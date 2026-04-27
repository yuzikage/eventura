import { createContext, useContext, useState, useEffect } from "react";
import { authApi, setToken, clearToken, getToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  
  // loading = true while we're restoring the session on first mount.
  // ProtectedRoute will wait for this to finish before deciding to redirect,
  // preventing a flash-redirect on page reload.
  const [loading, setLoading] = useState(true);

  // Session restore on page reload
  useEffect(() => {
    const restoreSession = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await authApi.me();
        setUser(userData);
      } catch {
        // Token expired or invalid — wipe it so the user is treated as logged out
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Login
  // Called by Login.jsx and StaffLogin.jsx after a successful API response.
  // Receives the full { token, user } object from the API.
  const login = ({ token, user: userData }) => {
    setToken(token);
    setUser(userData);
  };

  // Logout
  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
