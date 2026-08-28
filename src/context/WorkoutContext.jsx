import { createContext, useContext, useCallback, useMemo } from "react";
import { useAccountStorage } from "../hooks/useAccountStorage";

const WorkoutContext = createContext(null);

// Isolasi penuh per akun, pola yang sama persis dengan MealReminderContext/
// AppContext/HistoryContext — key localStorage otomatis
// `bulkyapp_workout_plan_<userId>`.
const NAMESPACE = "workout_plan";

// Program default: Push/Pull/Legs 6 hari (2x per pola otot/minggu) + 1 hari
// istirahat — struktur klasik untuk hypertrophy/latihan beban terstruktur
// yang menunjang bulking (supaya surplus kalori terpakai jadi otot, bukan
// sekadar lemak). Sets x reps 8-12 (rentang hypertrophy standar).
const EXERCISE_LIBRARY = {
  push: [
    { name: "Bench Press (Barbell)", sets: 4, reps: "8-10" },
    { name: "Overhead Press (Barbell)", sets: 3, reps: "8-10" },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
    { name: "Lateral Raise", sets: 3, reps: "12-15" },
    { name: "Triceps Pushdown", sets: 3, reps: "10-12" },
  ],
  pull: [
    { name: "Deadlift (Barbell)", sets: 3, reps: "6-8" },
    { name: "Pull-Up / Lat Pulldown", sets: 4, reps: "8-10" },
    { name: "Barbell Row", sets: 3, reps: "8-10" },
    { name: "Face Pull", sets: 3, reps: "12-15" },
    { name: "Barbell Curl", sets: 3, reps: "10-12" },
  ],
  legs: [
    { name: "Back Squat (Barbell)", sets: 4, reps: "8-10" },
    { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
    { name: "Leg Press", sets: 3, reps: "10-12" },
    { name: "Leg Curl", sets: 3, reps: "10-12" },
    { name: "Standing Calf Raise", sets: 4, reps: "12-15" },
  ],
  rest: [],
};

export const WORKOUT_TYPES = {
  push: { label: "Push (Dada, Bahu, Trisep)", color: "amber" },
  pull: { label: "Pull (Punggung, Bisep)", color: "sage" },
  legs: { label: "Legs (Kaki & Bokong)", color: "clay" },
  rest: { label: "Istirahat / Recovery", color: "ink" },
};

const DEFAULT_WEEKLY_SPLIT = {
  mon: "push",
  tue: "pull",
  wed: "legs",
  thu: "rest",
  fri: "push",
  sat: "pull",
  sun: "legs",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]; // Date().getDay() -> 0=Minggu

const DEFAULT_STATE = {
  split: DEFAULT_WEEKLY_SPLIT, // { mon: 'push', ... } — bisa dikustomisasi pengguna
  log: {}, // { "2026-08-28": { done: true, completedAt } }
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayDayCode() {
  return JS_DAY_TO_KEY[new Date().getDay()];
}

export function WorkoutProvider({ children }) {
  const { value: state, setValue: setState, clear: clearWorkoutPlan } = useAccountStorage(
    NAMESPACE,
    DEFAULT_STATE
  );

  const setDayType = useCallback(
    (dayCode, type) => {
      setState((prev) => ({ ...prev, split: { ...prev.split, [dayCode]: type } }));
    },
    [setState]
  );

  const toggleWorkoutDone = useCallback(
    (dateKey) => {
      setState((prev) => {
        const wasDone = Boolean(prev.log[dateKey]?.done);
        return {
          ...prev,
          log: {
            ...prev.log,
            [dateKey]: wasDone ? { done: false } : { done: true, completedAt: new Date().toISOString() },
          },
        };
      });
    },
    [setState]
  );

  const getExercisesFor = useCallback((type) => EXERCISE_LIBRARY[type] || [], []);

  const todayType = state.split[todayDayCode()] || "rest";
  const todayDone = Boolean(state.log[todayKey()]?.done);

  // Ringkasan minggu berjalan — dipakai di halaman Latihan untuk tampilan
  // 7 hari sekaligus.
  const weekPlan = useMemo(
    () => DAY_ORDER.map((day) => ({ day, type: state.split[day] || "rest" })),
    [state.split]
  );

  return (
    <WorkoutContext.Provider
      value={{
        split: state.split,
        log: state.log,
        weekPlan,
        todayType,
        todayDone,
        todayKey,
        todayDayCode,
        setDayType,
        toggleWorkoutDone,
        getExercisesFor,
        clearWorkoutPlan,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within a <WorkoutProvider>");
  return ctx;
}
