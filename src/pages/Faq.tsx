const FAQS = [
  {
    q: "Is my financial data private?",
    a: "Yes. Your expenses are scoped to your account. The AI assistant runs read-only queries and never shares your data with other users.",
  },
  {
    q: "Do I need an AI key?",
    a: "Core tracking works without one. AI insights and the chat assistant use an OpenAI (or Claude) key you add in Settings — you control the spend.",
  },
  {
    q: "How do I add an expense quickly?",
    a: "Use the chat assistant — type something like \"add 250 for lunch\" and confirm. You can also use the Add Expense button on the Expenses page.",
  },
  {
    q: "Can the assistant change my data?",
    a: "Only with your confirmation. Create/update/delete actions show a preview first; questions about your spending are read-only.",
  },
  {
    q: "How do I set a default category?",
    a: "On the Categories page, tap the star on a category. New expenses will preselect it.",
  },
];

export default function Faq() {
  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Frequently asked questions</h1>
      <div className="mt-8 space-y-6">
        {FAQS.map((f) => (
          <div key={f.q}>
            <h2 className="text-[16px] font-semibold text-ink-hi">{f.q}</h2>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
