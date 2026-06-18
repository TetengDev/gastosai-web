import SubmissionForm from "../components/SubmissionForm";

export default function Contact() {
  return (
    <div>
      <h1 className="font-display text-4xl font-medium tracking-tight text-ink-hi">Contact us</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Questions, bug reports, or anything else — send it our way and we'll get back to you.
      </p>
      <div className="mt-8">
        <SubmissionForm type="CONTACT" submitLabel="Send message" />
      </div>
    </div>
  );
}
