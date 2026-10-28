import { ArrowRight, Bot, Check, FileText, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const capabilities = [
  {
    icon: FileText,
    title: "Your business files, organized",
    description: "Bring invoices, notes, and spreadsheets into one private workspace.",
  },
  {
    icon: Sparkles,
    title: "Answers with sources",
    description: "Find what matters in your documents and see where each answer came from.",
  },
  {
    icon: LockKeyhole,
    title: "You stay in control",
    description: "Review useful drafts and proposed actions before anything goes further.",
  },
];

const principles = [
  "Local-first AI with Ollama",
  "No silent cloud processing",
  "Human review for consequential actions",
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-[#172033]">
      <div className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-violet-200/50 blur-3xl" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-3 text-[#172033] no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#6D5EF7] text-white shadow-lg shadow-violet-200">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight">KaamAI</span>
        </Link>
        <Link
          to="/dashboard"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-[#6D5EF7]"
        >
          Open demo workspace
        </Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pb-28 lg:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#6D5EF7] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Your calm, capable ops companion
          </div>
          <h1 className="mt-7 max-w-2xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[#172033] sm:text-5xl lg:text-6xl">
            Spend less time searching. Get back to your work.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            KaamAI helps independent businesses make sense of invoices, files, and everyday
            records—with clear answers, useful drafts, and you in control.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6D5EF7] px-5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-[#584ae5]"
            >
              Explore the demo <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-violet-200 hover:text-[#6D5EF7]"
            >
              How it works
            </a>
          </div>
          <ul className="mt-8 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {principles.map((principle) => (
              <li key={principle} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {principle}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-xl" id="how-it-works">
          <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-violet-200/70 via-white to-teal-100/70 blur-xl" />
          <div className="relative rounded-[1.75rem] border border-white bg-white p-5 shadow-2xl shadow-slate-300/50 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  A clearer workday
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#172033]">
                  From documents to decisions
                </h2>
              </div>
              <span className="rounded-xl bg-violet-50 p-3 text-[#6D5EF7]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-3 py-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-white p-2 text-slate-500 shadow-sm">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Upload a file or import a CSV
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Review what KaamAI can read before using it.
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-5 h-5 border-l-2 border-dashed border-violet-200" />
              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-white p-2 text-[#6D5EF7] shadow-sm">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Ask a question in plain language
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Get an answer grounded in your workspace sources.
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-5 h-5 border-l-2 border-dashed border-teal-200" />
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-white p-2 text-teal-700 shadow-sm">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Review the sources and next step
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Drafts wait for your approval; nothing is sent automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs text-slate-300">
              <LockKeyhole className="h-4 w-4 text-teal-300" aria-hidden="true" />
              Local-first by default · No silent provider switching
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-slate-200/80 bg-white/70 px-5 py-14 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#6D5EF7]">
              Built for the work behind your work
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Simple tools. Clear control.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="inline-flex rounded-xl bg-violet-50 p-3 text-[#6D5EF7]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#172033]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>KaamAI · AI-assisted operations, with human oversight.</p>
        <p>Prototype workspace uses synthetic demo data.</p>
      </footer>
    </main>
  );
}
