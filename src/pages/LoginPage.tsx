import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";
import AuthModeTabs from "../components/AuthModeTabs";
import { requestMagicLink } from "../api/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Invalid email or password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicError(null);
    setMagicLoading(true);
    try {
      await requestMagicLink(magicEmail);
      setMagicSent(true);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
      const msg = data?.detail ?? data?.message ?? "Failed to send link. Please try again.";
      setMagicError(msg);
    } finally {
      setMagicLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="select-none font-display text-4xl font-bold tracking-tight text-ink-hi">
            Gastos<span className="text-brand">AI</span>
          </h1>
          <p className="mt-2 text-sm text-ink-2">Welcome back — sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-edge bg-surface p-8 shadow-sm">
          <AuthModeTabs active="login" />
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-[#b30000]/10 px-4 py-2.5 text-sm text-[#b30000]">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-edge" />
            <span className="text-xs text-ink-2">or</span>
            <span className="h-px flex-1 bg-edge" />
          </div>

          {magicSent ? (
            <div className="rounded-xl border border-edge bg-surface-2 px-5 py-4 text-center">
              <p className="text-sm font-medium text-ink">Check your inbox</p>
              <p className="mt-1 text-sm text-ink-2">
                We sent a sign-in link to <span className="font-medium text-ink">{magicEmail}</span>. Click it to log in.
              </p>
              <button
                type="button"
                onClick={() => { setMagicSent(false); setMagicEmail(""); }}
                className="mt-3 text-xs text-link hover:underline"
              >
                Send to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <p className="text-sm font-medium text-ink">Email me a sign-in link</p>
              <input
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
              />
              {magicError && (
                <p className="rounded-xl bg-[#b30000]/10 px-4 py-2.5 text-sm text-[#b30000]">{magicError}</p>
              )}
              <Button type="submit" variant="secondary" className="w-full" disabled={magicLoading}>
                {magicLoading ? "Sending…" : "Send sign-in link"}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-2">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-link hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
