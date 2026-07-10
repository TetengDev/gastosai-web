import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader } from "lucide-react";
import { getSubscription } from "../api/subscription";
import { VIEW_AS_CHANGED_EVENT } from "../api/entitlements";
import { Button } from "../components/ui";

const MAX_POLLS = 6;
const POLL_INTERVAL_MS = 3000;

export default function CheckoutReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get("status");

  const [upgraded, setUpgraded] = useState(false);
  const [polling, setPolling] = useState(() => status === "success");
  const [pollsDone, setPollsDone] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshEntitlements = () => {
    window.dispatchEvent(new CustomEvent(VIEW_AS_CHANGED_EVENT));
  };

  useEffect(() => {
    if (status !== "success") return;

    let count = 0;
    let active = true;

    const poll = async () => {
      try {
        const sub = await getSubscription();
        if (sub.plan === "PREMIUM" && sub.status === "ACTIVE") {
          if (active) {
            setUpgraded(true);
            setPolling(false);
            refreshEntitlements();
          }
          return;
        }
      } catch {
        // ignore, keep polling
      }

      count += 1;
      if (active) setPollsDone(count);

      if (count < MAX_POLLS) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        if (active) setPolling(false);
      }
    };

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status]);

  if (status === "cancelled") {
    return (
      <div className="mx-auto max-w-[480px] py-24 text-center">
        <XCircle className="mx-auto h-12 w-12 text-[#b30000]" />
        <h1 className="mt-4 font-display text-2xl font-medium text-ink-hi">Payment cancelled</h1>
        <p className="mt-2 text-[15px] text-ink-2">No charges were made. You can try again whenever you're ready.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => navigate("/pricing")}>Try again</Button>
          <Button variant="secondary" onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    if (upgraded) {
      return (
        <div className="mx-auto max-w-[480px] py-24 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-[#1f8a5b]" />
          <h1 className="mt-4 font-display text-2xl font-medium text-ink-hi">You're now Premium!</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            Your plan has been upgraded. All Premium features are now unlocked.
          </p>
          <div className="mt-8">
            <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          </div>
        </div>
      );
    }

    if (polling) {
      return (
        <div className="mx-auto max-w-[480px] py-24 text-center">
          <Loader className="mx-auto h-10 w-10 animate-spin text-brand" />
          <h1 className="mt-4 font-display text-2xl font-medium text-ink-hi">Confirming your payment…</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            This usually takes a few seconds. Please wait.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-[480px] py-24 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-[#1f8a5b]" />
        <h1 className="mt-4 font-display text-2xl font-medium text-ink-hi">Payment received!</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Your upgrade is still being processed. Check back in a moment — it typically completes within a minute.
        </p>
        <p className="mt-1 text-[13px] text-ink-3">Checked {pollsDone} time{pollsDone !== 1 ? "s" : ""}.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
          <Button variant="secondary" onClick={() => navigate("/settings")}>Billing settings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[480px] py-24 text-center">
      <p className="text-[15px] text-ink-2">No checkout session found.</p>
      <div className="mt-6">
        <Button onClick={() => navigate("/pricing")}>View pricing</Button>
      </div>
    </div>
  );
}
