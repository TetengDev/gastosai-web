import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";
import Piso from "../brand/Piso";
import Wordmark from "../brand/Wordmark";
import AuthModeTabs from "../components/AuthModeTabs";
import Footer from "../components/Footer";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const inputClass =
    "w-full rounded-xl border border-edge-input bg-input px-4 py-2.5 text-sm text-ink";

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="flex select-none items-center justify-center gap-2.5 font-display text-4xl font-bold tracking-tight text-ink-hi">
            <Piso state="resting" size={30} />
            <Wordmark />
          </h1>
          <p className="mt-2 text-sm text-ink-2">Welcome back — sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-edge bg-surface p-8 shadow-sm">
          <AuthModeTabs active="login" />
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-ink">Password</label>
              <input
                id="current-password"
                name="current-password"
                type="password"
                autoComplete="current-password"
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

          <p className="mt-6 text-center text-sm text-ink-2">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-link hover:underline">
              Create one
            </Link>
          </p>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
