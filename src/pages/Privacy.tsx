export default function Privacy() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Privacy Policy</h1>
      <p className="text-sm text-ink-3">Last updated: 2026</p>
      <p className="text-[15px] leading-relaxed text-ink-2">
        GastosAI stores the data you enter — expenses, budgets, goals, recurring bills, and account
        details — to provide the service to you. Your records are scoped to your account and are not
        shared with other users.
      </p>
      <h2 className="pt-2 text-[16px] font-semibold text-ink-hi">What we store</h2>
      <p className="text-[15px] leading-relaxed text-ink-2">
        Your email, profile preferences, and the financial records you create. If you add an AI
        provider key, it is encrypted at rest and never returned to the browser.
      </p>
      <h2 className="pt-2 text-[16px] font-semibold text-ink-hi">AI processing</h2>
      <p className="text-[15px] leading-relaxed text-ink-2">
        When you use AI features, relevant query data is sent to your configured provider (OpenAI or
        Claude) to generate a response. Your provider key is used only for your own requests.
      </p>
      <h2 className="pt-2 text-[16px] font-semibold text-ink-hi">Contact</h2>
      <p className="text-[15px] leading-relaxed text-ink-2">
        Questions about your data? Reach us via the Contact page.
      </p>
    </div>
  );
}
