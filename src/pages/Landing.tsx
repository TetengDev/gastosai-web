import { Link } from "react-router-dom";
import Piso from "../brand/Piso";
import PublicLayout from "../components/PublicLayout";

const FEATURES = [
  { title: "Type it like you'd say it", body: "\"lunch at the carinderia 177\" becomes a logged expense. No forms, no dropdowns." },
  { title: "Snap the receipt", body: "Take a photo and GastosAI reads the store, the total and the category for you." },
  { title: "Ask, or tell it what to do", body: "Ask what you spent on food this month, or say \"add 250 for lunch\". It shows you first; you tap Save." },
  { title: "Safe to spend, down to the day", body: "See what's left this month and how much you can spend each day without going over." },
  { title: "50-30-20, built in", body: "Split your income into needs, wants and savings, and see how each bucket is doing." },
  { title: "Bills and goals, on track", body: "Upcoming bills and savings goals in one place, with a heads-up before you overspend." },
];

const primary =
  "inline-flex items-center justify-center rounded-full bg-cta px-6 py-3 text-sm font-medium text-cta-fg transition-opacity hover:opacity-90";
const secondary =
  "inline-flex items-center justify-center rounded-full border border-edge-input bg-surface px-6 py-3 text-sm font-medium text-ink-hi transition-colors hover:bg-surface-2";

/** Public home for logged-out visitors at `/`: what GastosAI is, the 60-second tour, and the way in. */
export default function Landing() {
  return (
    <PublicLayout wide>
      <section className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-hi md:text-6xl">
            Saan napunta ang sweldo ko?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            GastosAI answers that, one coin at a time. Log spending the way you'd say it, snap receipts,
            and ask about your own numbers, in pesos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className={primary}>Create account</Link>
            <Link to="/login" className={secondary}>Sign in</Link>
          </div>
        </div>
        <Piso state="saved" size={160} className="mx-auto hidden md:block" />
      </section>

      <section className="mt-16" aria-labelledby="tour-heading">
        <h2 id="tour-heading" className="mb-4 font-display text-2xl font-medium text-ink-hi">
          GastosAI in 60 seconds
        </h2>
        <video
          src="/tour/gastosai-tour.mp4"
          poster="/tour/gastosai-tour.jpg"
          controls
          playsInline
          preload="none"
          className="aspect-video w-full rounded-2xl border border-edge bg-black"
        >
          <track kind="captions" src="/tour/gastosai-tour.en.vtt" srcLang="en" label="English" />
        </video>
      </section>

      <section className="mt-16" aria-labelledby="features-heading">
        <h2 id="features-heading" className="mb-6 font-display text-2xl font-medium text-ink-hi">
          What makes it different
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-edge bg-surface p-6">
              <h3 className="font-display text-lg font-medium text-ink-hi">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 rounded-2xl bg-hero px-8 py-12 text-center text-white">
        <p className="font-display text-3xl font-bold tracking-tight">Every peso, accounted for.</p>
        <Link
          to="/register"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-[#003c33] transition-opacity hover:opacity-90"
        >
          Create account
        </Link>
      </section>
    </PublicLayout>
  );
}
