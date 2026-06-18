import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Footer from "./Footer";

/** Shell for logged-out public pages (Contact, About, etc.): wordmark bar + content + footer. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="border-b border-edge-2">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-6 md:px-10">
          <Link to="/" className="font-display text-[21px] font-bold tracking-tight text-ink-hi">
            Gastos<span className="text-[#1f8a5b]">AI</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-ink-2 transition-colors hover:text-link">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[820px] flex-1 px-6 py-12 md:px-10">{children}</main>
      <Footer />
    </div>
  );
}
