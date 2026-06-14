import { useCallback, useEffect, useState } from "react";
import { getAlerts } from "../api/alerts";

const currentMonth = new Date().toISOString().slice(0, 7);

export function useUnreadAlertCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getAlerts(currentMonth)
      .then((alerts) => {
        setCount(alerts.filter((a) => !a.read && !a.dismissed).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("gastosai:expense-changed", refresh);
    window.addEventListener("gastosai:alert-changed", refresh);
    return () => {
      window.removeEventListener("gastosai:expense-changed", refresh);
      window.removeEventListener("gastosai:alert-changed", refresh);
    };
  }, [refresh]);

  return count;
}
