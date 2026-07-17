import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AnnouncementBar from "./components/AnnouncementBar";
import ChatWidget from "./components/ChatWidget";
import FirstRunTour from "./components/FirstRunTour";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import About from "./pages/About";
import AdminSubmissions from "./pages/AdminSubmissions";
import AdminChatAudit from "./pages/AdminChatAudit";
import AdminObservability from "./pages/AdminObservability";
import Budget from "./pages/Budget";
import Categories from "./pages/Categories";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Alerts from "./pages/Alerts";
import Faq from "./pages/Faq";
import Feedback from "./pages/Feedback";
import Goals from "./pages/Goals";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import VerifyMagicLink from "./pages/VerifyMagicLink";
import Privacy from "./pages/Privacy";
import Recurring from "./pages/Recurring";
import RegisterPage from "./pages/RegisterPage";
import Settings from "./pages/Settings";
import Terms from "./pages/Terms";
import Pricing from "./pages/Pricing";
import CheckoutReturn from "./pages/CheckoutReturn";
import { BILLING_ENABLED } from "./config/billing";

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
    <div className="min-h-screen bg-page transition-colors duration-300">
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/auth/verify" element={<VerifyMagicLink />} />
        <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/feedback" element={<PublicLayout><Feedback /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/faq" element={<PublicLayout><Faq /></PublicLayout>} />
        <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
        <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <>
                <AnnouncementBar />
                <Navbar isDark={darkMode} onToggleDark={onToggleDark} />
                <main className="max-w-[1240px] mx-auto px-6 md:px-10 py-12">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/budget" element={<Budget />} />
                    <Route path="/recurring" element={<Recurring />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin/submissions" element={<AdminSubmissions />} />
                    <Route path="/admin/chat-audit" element={<AdminChatAudit />} />
                    <Route path="/admin/observability" element={<AdminObservability />} />
                    {BILLING_ENABLED && (
                      <Route path="/pricing" element={<Pricing />} />
                    )}
                    {BILLING_ENABLED && (
                      <Route path="/billing/return" element={<CheckoutReturn />} />
                    )}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                <ChatWidget />
                <FirstRunTour />
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
