import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AlarmPlayer from "./components/AlarmPlayer";
import { registerServiceWorker } from "./utils/pushClient";

// Provider fitur baru
import { AuthProvider } from "./context/AuthContext";
import { HistoryProvider } from "./context/HistoryContext";
import { TargetProvider } from "./context/TargetContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MealReminderProvider } from "./context/MealReminderContext";
import { WorkoutProvider } from "./context/WorkoutContext";

// Route Guard & Halaman
import RequireAuth from "./routing/RequireAuth";
import RootRedirect from "./routing/RootRedirect";
import LoginPage from "./pages/LoginPage";
import LoginModal from "./components/auth/LoginModal";
import HistoryPage from "./pages/HistoryPage";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import WorkoutPage from "./pages/WorkoutPage";

// PENTING: AuthProvider HARUS membungkus AppProvider (bukan sebaliknya).
// AppContext, HistoryContext, dan TargetContext semuanya memakai
// useAccountStorage(), yang di dalamnya memanggil useAuth() untuk tahu
// akun mana yang sedang aktif -> Provider tersebut harus berada di BAWAH
// AuthProvider di pohon komponen, atau useAuth() akan melempar error.
//
// ThemeProvider sengaja diletakkan PALING LUAR (di atas AuthProvider):
// preferensi gelap/terang adalah setelan perangkat, bukan data akun, jadi
// harus tetap berfungsi di halaman /login (sebelum ada akun aktif) dan
// tidak boleh ikut ter-reset oleh logout seperti context lain di bawahnya.
export default function App() {
  // Daftarkan service worker sekali di awal supaya push notification bisa
  // diterima bahkan sebelum pengguna membuka halaman Pengaturan. Registrasi
  // ini aman dipanggil berkali-kali (browser akan no-op kalau sudah ada).
  useEffect(() => {
    registerServiceWorker().catch(() => {
      /* browser tidak mendukung service worker — fitur alarm push dilewati */
    });
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <HistoryProvider>
            <TargetProvider>
              <MealReminderProvider>
                <WorkoutProvider>
                  <BrowserRouter>
                    <Routes>
                      {/* "/" hanya menentukan tujuan (login / onboarding / dashboard) */}
                      <Route path="/" element={<RootRedirect />} />

                      {/* Rute Publik */}
                      <Route path="/login" element={<LoginPage />} />

                      {/* Rute Terproteksi (Wajib Login & Aman dari Tombol Back) */}
                      <Route
                        path="/onboarding"
                        element={
                          <RequireAuth>
                            <Onboarding />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/dashboard"
                        element={
                          <RequireAuth>
                            <Dashboard />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/riwayat"
                        element={
                          <RequireAuth>
                            <HistoryPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/pengaturan"
                        element={
                          <RequireAuth>
                            <SettingsPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/kalender"
                        element={
                          <RequireAuth>
                            <CalendarPage />
                          </RequireAuth>
                        }
                      />
                      <Route
                        path="/latihan"
                        element={
                          <RequireAuth>
                            <WorkoutPage />
                          </RequireAuth>
                        }
                      />

                      {/* Fallback jika rute tidak ditemukan */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>

                    <LoginModal />
                    <AlarmPlayer />
                  </BrowserRouter>
                </WorkoutProvider>
              </MealReminderProvider>
            </TargetProvider>
          </HistoryProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}