import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  Database,
  FileText,
  HelpCircle,
  Lightbulb,
  Search,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface GuideStep {
  number: number;
  title: string;
  description: string;
  actionText?: string;
  actionPath?: string;
}

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  useCase: string;
  steps: GuideStep[];
  tip?: string;
}

const GUIDES: GuideSection[] = [
  {
    id: "upload",
    title: "1. Uploading Documents & Spreadsheets",
    subtitle: "Feed KaamAI your company PDFs, policies, invoices, and sales sheets",
    badge: "Knowledge Ingestion",
    icon: Upload,
    useCase:
      "Use this whenever you receive a new contract, supplier agreement, employee policy handbook, or sales CSV. Once uploaded, KaamAI indexes the text so you can query it anytime.",
    steps: [
      {
        number: 1,
        title: "Navigate to the Documents page",
        description: "Click on 'Documents' in the left-hand navigation sidebar.",
        actionText: "Go to Documents",
        actionPath: "/documents",
      },
      {
        number: 2,
        title: "Drag and drop or select your file",
        description:
          "Drop a PDF or CSV file into the upload area. KaamAI accepts files up to 25MB.",
      },
      {
        number: 3,
        title: "Wait for automatic indexing",
        description:
          "KaamAI extracts the text and creates 768-dimensional AI embeddings. When the green 'indexed' badge appears, your document is ready for queries!",
      },
    ],
    tip: "Spreadsheet Safety: KaamAI automatically neutralizes malicious formula injections (=, +, -, @) so imported CSV files cannot harm your system.",
  },
  {
    id: "chat",
    title: "2. Asking Questions (Grounded AI Assistant)",
    subtitle: "Ask questions in plain English and receive answers backed by exact citations",
    badge: "Anti-Hallucination Q&A",
    icon: Bot,
    useCase:
      "Ask questions about what is inside your documents—such as 'What is our refund policy under the new Acme contract?' or 'Summarize section 4 of the HR handbook'.",
    steps: [
      {
        number: 1,
        title: "Open the AI Assistant",
        description: "Click on 'AI Assistant' in the sidebar or type directly into the Dashboard prompt.",
        actionText: "Open Assistant",
        actionPath: "/assistant",
      },
      {
        number: 2,
        title: "Type your business question",
        description:
          "Ask any question in everyday language. You do not need technical jargon or complex syntax.",
      },
      {
        number: 3,
        title: "Verify the cited sources",
        description:
          "Every answer comes with verifiable citations showing the document name and match score. If evidence is missing, KaamAI will honestly inform you rather than make things up.",
      },
    ],
    tip: "Honest AI Guarantee: Unlike ordinary chatbots, KaamAI will never guess or invent facts if the knowledge is not in your uploaded files.",
  },
  {
    id: "tools",
    title: "3. Deterministic Business & Financial Calculations",
    subtitle: "Calculate exact revenue and overdue invoices without spreadsheet math errors",
    badge: "Deterministic Tools",
    icon: Sparkles,
    useCase:
      "Language models often fail at mental math. KaamAI routes math questions directly to deterministic Python calculations for total sales, top products, and overdue balances.",
    steps: [
      {
        number: 1,
        title: "Import your invoice or sales spreadsheet",
        description: "Upload a CSV file containing date, amount, client, and status columns.",
        actionText: "Start CSV Import",
        actionPath: "/imports",
      },
      {
        number: 2,
        title: "Ask for mathematical totals",
        description:
          "In the AI Assistant, ask: 'What are my total sales this quarter?' or 'Which invoices are currently overdue?'.",
      },
      {
        number: 3,
        title: "Review exact dollar calculations",
        description:
          "KaamAI calculates exact sums, counts, and days overdue with 100% precision.",
      },
    ],
    tip: "Try asking: 'Which products had the highest sales revenue?' to see automatic ranking.",
  },
  {
    id: "approvals",
    title: "4. Human-in-the-Loop Governance & Approvals",
    subtitle: "Keep management in control before any major automated business action occurs",
    badge: "Risk Control",
    icon: Shield,
    useCase:
      "When an automated agent proposes sending an invoice reminder or archiving an old record, the action is paused in 'pending' status until a manager signs off.",
    steps: [
      {
        number: 1,
        title: "Check pending approvals",
        description: "Open the 'Approvals' page to see all staged actions awaiting review.",
        actionText: "View Approvals",
        actionPath: "/approvals",
      },
      {
        number: 2,
        title: "Inspect consequences and payloads",
        description:
          "Each item lists the requested action, initiator, timestamp, and audit implications.",
      },
      {
        number: 3,
        title: "Click Approve or Reject",
        description:
          "Approved actions are executed safely; rejected actions are archived with reason logs.",
      },
    ],
  },
  {
    id: "reports",
    title: "5. Generating Executive Business Reports",
    subtitle: "Create comprehensive reports in Markdown, CSV, and PDF ready for meetings",
    badge: "Intelligence Reports",
    icon: BarChart3,
    useCase:
      "Generate monthly operational overviews, audit logs, and performance breakdowns with one click to share with executive leadership or clients.",
    steps: [
      {
        number: 1,
        title: "Go to Reports",
        description: "Click 'Reports' in the navigation sidebar.",
        actionText: "Open Reports",
        actionPath: "/reports",
      },
      {
        number: 2,
        title: "Select report template",
        description:
          "Choose from Revenue Analysis, Compliance Audit, or Operational Overview.",
      },
      {
        number: 3,
        title: "Download and share",
        description: "Preview report contents in your browser or download directly.",
      },
    ],
  },
];

const FAQS = [
  {
    q: "Is my business data shared with third parties or publicly visible?",
    a: "No. Your documents and data are stored strictly in your private workspace in PostgreSQL. If running with Ollama, everything stays 100% offline on your machine.",
  },
  {
    q: "What file types can I upload?",
    a: "KaamAI supports PDF documents (contracts, policies, reports, manuals) and CSV files (invoices, sales data, customer ledgers).",
  },
  {
    q: "How does KaamAI prevent AI hallucinations?",
    a: "KaamAI uses Grounded Retrieval-Augmented Generation (RAG). Before answering, it searches your vector index for exact excerpts. If no relevant evidence is found, it states that information is missing.",
  },
  {
    q: "What is an Admin Portal?",
    a: "The Admin Portal allows workspace administrators to view all registered users, adjust permissions (owner, manager, analyst), and inspect system-wide numerical metrics.",
  },
];

export default function Documentation() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  const filteredGuides = GUIDES.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      g.useCase.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-600 via-[#6D5EF7] to-indigo-700 p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
            <BookOpen className="h-3.5 w-3.5" />
            <span>User Guide & Knowledge Base</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How to Use KaamAI
          </h1>
          <p className="text-base text-violet-100 leading-relaxed">
            Welcome! KaamAI is built to make business operations effortless. Whether you are non-technical or an experienced operator, this guide explains how every feature works step-by-step.
          </p>
        </div>

        {/* Decorative background shape */}
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search how to do something (e.g. 'upload', 'sales', 'approvals', 'citations')…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-13 rounded-2xl border-slate-200 bg-white pl-12 text-base shadow-sm focus-visible:ring-[#6D5EF7]"
        />
      </div>

      {/* Overview Cards: Core Capabilities */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white p-4 shadow-sm hover:border-violet-200 transition-all">
          <div className="rounded-xl bg-violet-50 p-2.5 text-[#6D5EF7] w-fit">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#172033]">Document RAG</h2>
          <p className="mt-1 text-xs text-slate-500 leading-normal">
            Upload PDFs and get answers backed by exact page citations.
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 transition-all">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 w-fit">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#172033]">Zero-Math Error</h2>
          <p className="mt-1 text-xs text-slate-500 leading-normal">
            Deterministic tools compute sales, overdue invoices, and rankings.
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm hover:border-amber-200 transition-all">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 w-fit">
            <Shield className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#172033]">Audit & Approvals</h2>
          <p className="mt-1 text-xs text-slate-500 leading-normal">
            High-impact business operations require human review before executing.
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-4 shadow-sm hover:border-sky-200 transition-all">
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600 w-fit">
            <Database className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-[#172033]">Dual AI Engine</h2>
          <p className="mt-1 text-xs text-slate-500 leading-normal">
            Switch between 100% offline local Ollama and free cloud Google Gemini.
          </p>
        </Card>
      </div>

      {/* Step-by-Step Action Guides */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[#172033]">
            Step-by-Step Operations Guides
          </h2>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            {filteredGuides.length} Guides Available
          </Badge>
        </div>

        {filteredGuides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Card key={guide.id} className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-100 p-2.5 text-[#6D5EF7]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-[#172033]">{guide.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        {guide.subtitle}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="border-violet-200 text-[#6D5EF7] bg-violet-50/40 w-fit">
                    {guide.badge}
                  </Badge>
                </div>

                <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs text-violet-900 flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-[#6D5EF7]" />
                  <span>
                    <strong>When to use this:</strong> {guide.useCase}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  {guide.steps.map((step) => (
                    <div
                      key={step.number}
                      className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:bg-slate-50"
                    >
                      <div>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6D5EF7] text-xs font-bold text-white shadow-sm">
                          {step.number}
                        </div>
                        <h4 className="mt-2.5 text-sm font-semibold text-[#172033]">
                          {step.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      {step.actionText && step.actionPath ? (
                        <div className="mt-4 pt-3 border-t border-slate-200/60">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(step.actionPath!)}
                            className="w-full justify-between text-xs font-medium text-[#6D5EF7] hover:bg-violet-50"
                          >
                            <span>{step.actionText}</span>
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {guide.tip ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{guide.tip}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Frequently Asked Questions */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-[#6D5EF7]">
            <HelpCircle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Help Center</span>
          </div>
          <CardTitle className="text-xl text-[#172033]">Frequently Asked Questions</CardTitle>
          <CardDescription>
            Quick answers to common questions about security, data formats, and AI behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {FAQS.map((faq, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={faq.q}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-[#172033]"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-180 text-[#6D5EF7]" : ""
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-200/60 px-4 pb-4 pt-2 text-xs text-slate-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
