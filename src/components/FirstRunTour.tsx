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
    content: "A quick tour of the essentials — close it anytime.",
  },
  { target: "[data-tour='nav-expenses']", content: "Log and review every expense here." },
  { target: "[data-tour='nav-budget']", content: "Set monthly budgets and see what's safe to spend." },
  { target: "[data-tour='nav-recurring']", content: "Manage recurring bills and subscriptions." },
  { target: "[data-tour='nav-goals']", content: "Save toward goals and track progress." },
  { target: "[data-tour='chat']", content: "Ask the AI assistant in plain language — log expenses, run reports, scan receipts." },
  {
    target: "[data-tour='nav-settings']",
    content: "Add your own OpenAI key in Settings to unlock the AI features. Everything else works without it.",
    placement: "bottom",
  },
];

export default function FirstRunTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(RUN_KEY) === "1" && localStorage.getItem(DONE_KEY) !== "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(true);
    }
    const onStart = () => setRun(true);
    window.addEventListener(TOUR_START_EVENT, onStart);
    return () => window.removeEventListener(TOUR_START_EVENT, onStart);
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
        primaryColor: "#4f46e5",
        textColor: "#1f2937",
        backgroundColor: "#ffffff",
        arrowColor: "#ffffff",
        overlayColor: "rgba(15, 23, 42, 0.55)",
        spotlightPadding: 8,
        spotlightRadius: 12,
        width: 340,
        zIndex: 10000,
      }}
    />
  );
}
