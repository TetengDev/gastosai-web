import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "ga-announcement-dismissed-v2";

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div className="relative flex h-9 flex-shrink-0 items-center justify-center gap-3.5 bg-hero px-12 text-[13px] text-white">
      <span className="opacity-85">
        AI insights, chat, and receipt scanning are built in — no setup needed.
      </span>
      <Link
        to="/settings"
        className="underline decoration-1 underline-offset-[3px] hover:opacity-90"
      >
        Prefer your own AI key? Add it in Settings
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-4 flex p-1 text-white/60 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
