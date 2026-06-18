export default function About() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">About GastosAI</h1>
      <p className="text-[15px] leading-relaxed text-ink-2">
        GastosAI is a personal expense tracker with a built-in AI assistant. Log expenses in plain
        language, set budgets and savings goals, track recurring bills, and ask questions about your
        spending — the assistant turns them into safe, read-only queries over your own data.
      </p>
      <p className="text-[15px] leading-relaxed text-ink-2">
        Your financial data stays yours: AI features run on a key you provide, and the assistant can
        only read your records — never modify them without your confirmation.
      </p>
      <p className="text-sm text-ink-3">Version {__APP_VERSION__}</p>
    </div>
  );
}
