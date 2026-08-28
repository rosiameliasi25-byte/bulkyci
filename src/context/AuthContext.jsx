import { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext(null);

// Diekspor supaya komponen lain (mis. hook penjaga rute) bisa memverifikasi
// status login langsung dari localStorage tanpa hardcode ulang nama key-nya.
export const SESSION_KEY = "bulkyapp_auth_user";
const USERS_KEY = "bulkyapp_users"; // local "database" of registered accounts

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Restore session on first load
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (stored) setUser(stored);
    } catch {
      // corrupted storage, ignore
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(({ name, email }) => {
    const trimmedEmail = email.trim().toLowerCase();
    const users = readUsers();
    let account = users.find((u) => u.email === trimmedEmail);

    if (!account) {
      account = {
        id: crypto.randomUUID(),
        name: name?.trim() || trimmedEmail.split("@")[0],
        email: trimmedEmail,
      };
      writeUsers([...users, account]);
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(account));
    setUser(account);
    setIsLoginOpen(false);
    return account;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        isLoginOpen,
        openLogin,
        closeLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
