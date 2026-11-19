import { useCallback, useEffect, useRef, useState } from "react";
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
import Landing from "./pages/Landing";
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
import {
  COLOR_SCHEME_KEY,
  clearLegacyTheme,
  clearOverride,
  readOverride,
  resolveScheme,
  toggleColorScheme,
  type ColorScheme,
} from "./lib/colorScheme";
import { getLocalStorage } from "./lib/storage";

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
        {/* Logged out, `/` is the public landing page; logged in, it falls through to the dashboard. */}
        {!user && <Route path="/" element={<Landing />} />}
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

const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * The scheme on screen, for the Navbar toggle. CSS already follows the <meta name="color-scheme">,
 * which `index.html` set before first paint; this keeps that meta, the OS and other tabs in step.
 */
function useColorScheme() {
  const [override, setOverride] = useState<ColorScheme | null>(() => readOverride(getLocalStorage()));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    clearLegacyTheme(getLocalStorage());
    // The OS can switch at any time (often on a schedule); the icon has to follow it live.
    const media = window.matchMedia(DARK_QUERY);
    media.onchange = (e) => setSystemDark(e.matches);
    // A toggle in another tab writes storage; pick it up without a reload.
    const onStorage = (e: StorageEvent) => {
      if (e.key === COLOR_SCHEME_KEY || e.key === null) setOverride(readOverride(getLocalStorage()));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media.onchange = null;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.setAttribute("content", override ?? "light dark");
  }, [override]);

  const toggle = () => setOverride(toggleColorScheme(override, systemDark, getLocalStorage()));
  const reset = useCallback(() => {
    clearOverride(getLocalStorage());
    setOverride(null);
  }, []);

  return { isDark: resolveScheme(override, systemDark) === "dark", toggle, reset };
}

export default function App() {
  const { isDark, toggle, reset } = useColorScheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell
          darkMode={isDark}
          onToggleDark={toggle}
          onResetDark={reset}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
