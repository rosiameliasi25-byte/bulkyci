import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";

const HistoryContext = createContext(null);

function historyKey(userId) {
  return `bulkyapp_history_${userId}`;
}

export function HistoryProvider({ children }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);

  // Load this account's history whenever the logged-in user changes
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(historyKey(user.id))) || [];
      setEntries(stored);
    } catch {
      setEntries([]);
    }
  }, [user]);

  const addEntry = useCallback(
    (entry) => {
      if (!user) return;
      setEntries((prev) => {
        const next = [
          { id: crypto.randomUUID(), date: new Date().toISOString(), ...entry },
          ...prev,
        ].slice(0, 200); // cap at last 200 entries
        localStorage.setItem(historyKey(user.id), JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const clearHistory = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(historyKey(user.id));
    setEntries([]);
  }, [user]);

  return (
    <HistoryContext.Provider value={{ entries, addEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within a <HistoryProvider>");
  return ctx;
}
