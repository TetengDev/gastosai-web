import SubmissionForm from "../components/SubmissionForm";

export default function Feedback() {
  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Suggestions &amp; feedback</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Have an idea or a feature you'd love to see? Tell us — your suggestions shape what we build next.
      </p>
      <div className="mt-8">
        <SubmissionForm type="SUGGESTION" submitLabel="Send suggestion" />
      </div>
    </div>
  );
}
