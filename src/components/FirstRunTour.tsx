import { useEffect, useState } from "react";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";

const RUN_KEY = "gastosai:tour:run";
const DONE_KEY = "gastosai:tour:completed";
export const TOUR_START_EVENT = "gastosai:tour:start";

/** Trigger the tour on demand (e.g. a "Replay tour" button). */
// eslint-disable-next-line react-refresh/only-export-components
export function startTour() {
  localStorage.setItem(RUN_KEY, "1");
  localStorage.removeItem(DONE_KEY);
  window.dispatchEvent(new CustomEvent(TOUR_START_EVENT));
}

const steps: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Welcome to GastosAI 👋",
    content:
      "A 60-second tour of what you can do — track spending, plan budgets, and let the AI assistant do the typing. Close it anytime.",
  },
  {
    target: "[data-tour='nav-expenses']",
    title: "Log expenses your way",
    content: "Add them by hand, import a CSV, snap a receipt, or just tell the assistant — they all land here.",
  },
  {
    target: "[data-tour='nav-budget']",
    title: "Budgets & safe-to-spend",
    content: "Set per-category budgets and watch your safe-to-spend and daily allowance update as you spend.",
  },
  {
    target: "[data-tour='nav-recurring']",
    title: "Recurring bills",
    content: "Track subscriptions and recurring bills so upcoming dues never catch you off guard.",
  },
  {
    target: "[data-tour='nav-goals']",
    title: "Savings goals",
    content: "Set a target, track progress, and see whether you're on pace to hit it.",
  },
  {
    target: "[data-tour='chat']",
    title: "Your AI money assistant",
    content:
      "Ask in plain language (\"how much on food last month?\"), log expenses, or scan a receipt. Switch tone — Plain, Professional, or GenZ — and revisit past chats from history.",
  },
  {
    target: "[data-tour='nav-settings']",
    placement: "bottom",
    title: "Settings & AI key",
    content:
      "Manage your profile and theme. AI runs on the included quota, or add your own provider key here. You can replay this tour anytime.",
  },
];

/** Resolve a CSS custom property to a concrete color via a hidden probe (handles nested var() chains). */
function resolveColor(varName: string, prop: "color" | "backgroundColor", fallback: string): string {
  if (typeof document === "undefined" || !document.body) return fallback;
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  probe.style[prop] = `var(${varName})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe)[prop];
  probe.remove();
  return value || fallback;
}

/** Tour colors pulled from the app's theme tokens so the popover matches light/dark mode. */
function readThemeColors() {
  return {
    primaryColor: "#1f8a5b", // brand green — legible on both themes
    textColor: resolveColor("--color-ink-hi", "color", "#16302a"),
    backgroundColor: resolveColor("--color-surface", "backgroundColor", "#ffffff"),
    arrowColor: resolveColor("--color-surface", "backgroundColor", "#ffffff"),
    overlayColor: "rgba(2, 8, 6, 0.55)",
  };
}

export default function FirstRunTour() {
  const [run, setRun] = useState(false);
  const [colors, setColors] = useState(readThemeColors);

  useEffect(() => {
    if (localStorage.getItem(RUN_KEY) === "1" && localStorage.getItem(DONE_KEY) !== "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(true);
    }
    const onStart = () => {
      setColors(readThemeColors());
      setRun(true);
    };
    window.addEventListener(TOUR_START_EVENT, onStart);
    // Re-resolve colors whenever the app toggles the `dark` class on <html>.
    const observer = new MutationObserver(() => setColors(readThemeColors()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener(TOUR_START_EVENT, onStart);
      observer.disconnect();
    };
  }, []);

  const handleEvent = (data: EventData) => {
    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(data.status)) {
      localStorage.setItem(DONE_KEY, "1");
      localStorage.removeItem(RUN_KEY);
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      options={{
        showProgress: true,
        skipBeacon: true,
        skipScroll: true,
        closeButtonAction: "skip",
        ...colors,
        spotlightPadding: 8,
        spotlightRadius: 12,
        width: 360,
        zIndex: 10000,
      }}
    />
  );
}
