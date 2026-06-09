import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChatWidget from "./components/ChatWidget";
import Navbar from "./components/Navbar";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:bg-none dark:bg-gray-950 transition-colors duration-300">
        <Navbar isDark={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <ChatWidget />
      </div>
    </BrowserRouter>
  );
}