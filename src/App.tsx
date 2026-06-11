import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChatWidget from "./components/ChatWidget";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Budget from "./pages/Budget";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import LoginPage from "./pages/LoginPage";
import Recurring from "./pages/Recurring";
import RegisterPage from "./pages/RegisterPage";
import Settings from "./pages/Settings";

function AppShell({ darkMode, onToggleDark, onResetDark }: { darkMode: boolean; onToggleDark: () => void; onResetDark: () => void }) {
  const { user } = useAuth();
  const prevUserRef = useRef(user);

  useEffect(() => {
    if (prevUserRef.current !== null && user === null) {
      onResetDark();
    }
    prevUserRef.current = user;
  }, [user, onResetDark]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:bg-none dark:bg-gray-950 transition-colors duration-300">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <Navbar isDark={darkMode} onToggleDark={onToggleDark} />
                <main className="max-w-5xl mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/recurring" element={<Recurring />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                <footer className="max-w-5xl mx-auto px-4 pb-6 flex justify-end">
                  <span className="text-xs text-gray-300 dark:text-gray-700 select-none">
                    v{__APP_VERSION__}
                  </span>
                </footer>
                <ChatWidget />
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
          onResetDark={() => setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches)}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
