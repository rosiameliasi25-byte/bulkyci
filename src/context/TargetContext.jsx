import { createContext, useContext, useCallback } from "react";
import { useAccountStorage } from "../hooks/useAccountStorage";

const TargetContext = createContext(null);

// Real key becomes `bulkyapp_target_<userId>` — same isolation
// guarantee as history, coming from the same shared hook.
const NAMESPACE = "target";

const DEFAULT_TARGET = {
  targetWeightKg: null,
  dailyCalorieGoal: null,
  updatedAt: null,
};

export function TargetProvider({ children }) {
  const { value: target, setValue: setTargetValue, clear: clearTarget } = useAccountStorage(
    NAMESPACE,
    DEFAULT_TARGET
  );

  const updateTarget = useCallback(
    (partial) => {
      setTargetValue((prev) => ({ ...prev, ...partial, updatedAt: new Date().toISOString() }));
    },
    [setTargetValue]
  );

  return (
    <TargetContext.Provider value={{ target, updateTarget, clearTarget }}>
      {children}
    </TargetContext.Provider>
  );
}

export function useTarget() {
  const ctx = useContext(TargetContext);
  if (!ctx) throw new Error("useTarget must be used within a <TargetProvider>");
  return ctx;
}
