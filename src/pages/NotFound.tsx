import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-7xl font-medium tracking-tight text-ink-hi">404</p>
      <p className="mt-3 text-lg font-semibold text-ink">Page not found</p>
      <p className="mt-1 text-sm text-ink-3">The page you're looking for doesn't exist or has moved.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-full bg-cta px-5 py-2.5 text-sm font-medium text-cta-fg transition-opacity hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
