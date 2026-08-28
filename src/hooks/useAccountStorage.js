import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

// Single source of truth for how account-scoped keys are built.
// Every piece of per-account data (history, target, preferences, ...)
// MUST go through this so two accounts can never collide or overwrite
// each other, even if namespaces are added later.
function scopedKey(namespace, accountId) {
  return `bulkyapp_${namespace}_${accountId}`;
}

/**
 * Persists `namespace` data to localStorage, scoped to the currently
 * logged-in account (user.id). Automatically reloads (and resets to
 * defaultValue) whenever the active account changes, so switching
 * accounts can never leak data from the previous session.
 */
export function useAccountStorage(namespace, defaultValue) {
  const { user } = useAuth();
  const [value, setValueState] = useState(defaultValue);

  useEffect(() => {
    if (!user) {
      setValueState(defaultValue);
      return;
    }
    try {
      const raw = localStorage.getItem(scopedKey(namespace, user.id));
      setValueState(raw !== null ? JSON.parse(raw) : defaultValue);
    } catch {
      setValueState(defaultValue);
    }
    // defaultValue is intentionally excluded: it's a stable "shape"
    // constant per call-site, not something that should re-trigger loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, namespace]);

  const setValue = useCallback(
    (updater) => {
      if (!user) return;
      setValueState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        localStorage.setItem(scopedKey(namespace, user.id), JSON.stringify(next));
        return next;
      });
    },
    [user, namespace]
  );

  const clear = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(scopedKey(namespace, user.id));
    setValueState(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, namespace]);

  return { value, setValue, clear };
}
