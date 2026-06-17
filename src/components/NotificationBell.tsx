import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUnreadAlertCount } from "../hooks/useUnreadAlertCount";

export function NotificationBell() {
  const navigate = useNavigate();
  const count = useUnreadAlertCount();
  return (
    <button
      onClick={() => navigate("/alerts")}
      aria-label="Notifications"
      title="Notifications"
      className="relative p-2 rounded-full text-ink-3 hover:text-ink-hi hover:bg-surface-2 transition-colors"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#ff7759] text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-nav">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
