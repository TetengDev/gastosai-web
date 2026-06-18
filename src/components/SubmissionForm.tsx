import { useState } from "react";
import { createSubmission, type SubmissionType } from "../api/submissions";
import { Button } from "./ui";

const inputClass = "w-full rounded-xl border border-edge-input bg-input px-3.5 py-3 text-sm text-ink";
const labelClass = "mb-2 block text-sm font-medium text-ink";

export default function SubmissionForm({ type, submitLabel }: { type: SubmissionType; submitLabel: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await createSubmission({
        type,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        message: message.trim(),
      });
      setSent(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent)
    return (
      <div className="rounded-2xl border border-edge bg-surface p-8 text-center">
        <p className="mb-2 text-2xl">✅</p>
        <p className="font-semibold text-ink-hi">Thanks — your message was sent.</p>
        <p className="mt-1 text-sm text-ink-2">We read every submission.</p>
        <Button variant="secondary" className="mt-4" onClick={() => setSent(false)}>
          Send another
        </Button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="sf-name" className={labelClass}>
          Name <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <input id="sf-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Your name" className={inputClass} />
      </div>
      <div>
        <label htmlFor="sf-email" className={labelClass}>
          Email <span className="font-normal text-ink-3">(optional, so we can reply)</span>
        </label>
        <input id="sf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="you@example.com" className={inputClass} />
      </div>
      <div>
        <label htmlFor="sf-message" className={labelClass}>
          Message <span className="text-alert">*</span>
        </label>
        <textarea id="sf-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required rows={6} placeholder="How can we help?" className={inputClass} />
      </div>
      {error && <p className="text-sm font-medium text-[#b30000]">{error}</p>}
      <Button type="submit" disabled={sending || !message.trim()}>
        {sending ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
