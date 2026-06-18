import { Link } from "react-router-dom";

const LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/feedback", label: "Feedback" },
  { to: "/faq", label: "FAQ" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-edge-2">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-8 md:px-10 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-ink-2 transition-colors hover:text-link">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="select-none text-xs text-ink-3">
          © {new Date().getFullYear()} GastosAI · v{__APP_VERSION__}
        </div>
      </div>
    </footer>
  );
}
