import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyMagicLink } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

export default function VerifyMagicLink() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "error">(
    token ? "loading" : "error"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(
    token ? null : "No sign-in token was provided."
  );

  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;

    verifyMagicLink(token)
      .then((res) => {
        applySession(res);
        navigate("/", { replace: true });
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string; detail?: string } } })
            ?.response?.data?.message ??
          "This link is invalid or has expired.";
        setErrorMsg(msg);
        setStatus("error");
      });
  }, [token, navigate, applySession]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="select-none font-display text-4xl font-bold tracking-tight text-ink-hi">
            Gastos<span className="text-brand">AI</span>
          </h1>
          <p className="mt-6 text-sm text-ink-2">Signing you in&hellip;</p>
          <div className="mx-auto mt-4 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="select-none font-display text-4xl font-bold tracking-tight text-ink-hi">
            Gastos<span className="text-brand">AI</span>
          </h1>
        </div>
        <div className="rounded-2xl border border-edge bg-surface p-8 shadow-sm text-center space-y-4">
          <p className="text-sm font-medium text-ink">
            {errorMsg ?? "This link is invalid or has expired."}
          </p>
          <p className="text-sm text-ink-2">
            The sign-in link may have already been used or it has expired. Request a new one from the login page.
          </p>
          <Link to="/login">
            <Button type="button" variant="secondary" className="w-full">
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
