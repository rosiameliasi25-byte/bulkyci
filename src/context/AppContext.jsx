import { createContext, useContext, useCallback } from "react";
import { useAccountStorage } from "../hooks/useAccountStorage";

// AppContext menyimpan seluruh state aplikasi: profil pengguna, target harian,
// makanan yang sudah di-log hari ini, dan streak.
//
// PENTING: state ini di-scope per akun lewat useAccountStorage (sama seperti
// HistoryContext & TargetContext), sehingga key localStorage-nya menjadi
// `bulkyapp_state_<userId>`. Dengan begitu, profil/onboarding/log makanan
// milik satu akun tidak akan pernah tercampur atau tertimpa oleh akun lain,
// dan otomatis kosong lagi saat berpindah/keluar akun.
const AppContext = createContext(null);
const NAMESPACE = "state";

const defaultState = {
  onboarded: false,
  profile: null, // { weight, targetWeight, height, age, gender, activity }
  targets: null, // { calorieTarget, proteinTarget, carbTarget, fatTarget }
  streak: 4,
  todayLog: [], // { id, name, calories, protein, carbs, fat, time }
};

export function AppProvider({ children }) {
  const { value: state, setValue: setState, clear: clearState } = useAccountStorage(
    NAMESPACE,
    defaultState
  );

  // Menyimpan hasil onboarding + target kalori/makro yang sudah dihitung
  const completeOnboarding = useCallback(
    (profile, targets) => {
      setState((prev) => ({
        ...prev,
        onboarded: true,
        profile,
        targets,
      }));
    },
    [setState]
  );

  // Menambahkan makanan hasil scan AI ke log hari ini
  const addFoodToLog = useCallback(
    (food) => {
      setState((prev) => ({
        ...prev,
        todayLog: [...prev.todayLog, { ...food, id: crypto.randomUUID(), time: new Date().toISOString() }],
      }));
    },
    [setState]
  );

  const resetToday = useCallback(() => setState((prev) => ({ ...prev, todayLog: [] })), [setState]);

  // --- Ditambahkan untuk halaman Pengaturan ---------------------------
  // Update sebagian target nutrisi (kalori/protein/karbo/lemak) tanpa
  // harus mengulang seluruh alur onboarding. Hanya field yang dikirim
  // yang berubah, sisanya tetap seperti semula.
  const updateTargets = useCallback(
    (partialTargets) => {
      setState((prev) => ({
        ...prev,
        targets: { ...prev.targets, ...partialTargets },
      }));
    },
    [setState]
  );

  // Update sebagian data fisik profil (berat, tinggi, umur, aktivitas, dst)
  // — dipakai Settings saat pengguna ingin menghitung ulang target secara
  // otomatis dari data fisik terbaru.
  const updateProfile = useCallback(
    (partialProfile) => {
      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...partialProfile },
      }));
    },
    [setState]
  );
  // ---------------------------------------------------------------------

  return (
    <AppContext.Provider
      value={{
        ...state,
        completeOnboarding,
        addFoodToLog,
        resetToday,
        clearState,
        updateTargets,
        updateProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam <AppProvider>");
  return ctx;
}
