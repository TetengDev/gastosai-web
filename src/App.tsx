import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ChatWidget from "./components/ChatWidget";
import Navbar from "./components/Navbar";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <Navbar />
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
