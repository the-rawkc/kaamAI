import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import type { Document, RecentActivity } from "@/types";

const SUGGESTED_PROMPTS = [
  "What are my outstanding invoices?",
  "Summarize the Q3 expense report",
  "Find the contract renewal clause for Acme",
  "Categorize my expenses by vendor",
  "Generate a monthly revenue report",
];

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  positive,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: string;
  positive?: boolean;
  description: string;
}) {
  return (
    <Card className="h-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className="rounded-lg bg-violet-50 p-2 text-[#6D5EF7]">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="text-3xl font-semibold tracking-tight text-[#172033]">{value}</div>
        {change ? (
          <div className={`text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {positive ? "▲" : "▼"} {change}
          </div>
        ) : null}
        <p className="text-xs text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = React.useState<any>(null);
  const [activity, setActivity] = React.useState<RecentActivity[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [prompt, setPrompt] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [summaryRes, activityRes, documentsRes, reportsRes] = await Promise.all([
          api.getDashboardSummary(),
          api.getRecentActivity(),
          api.getDocuments(),
          api.getReports(),
        ]);

        if (!cancelled) {
          setSummary(summaryRes.summary);
          setActivity(activityRes.activities);
          setDocuments(documentsRes.documents);
          setReports(reportsRes.reports);
        }
      } catch {
        if (!cancelled) {
          setError("We could not load the live dashboard. Demo data is shown instead.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    navigate(`/assistant?q=${encodeURIComponent(prompt.trim())}`);
  };

  const recentDocuments = documents.slice(0, 3);
  const recentReports = reports.slice(0, 2);

  const stats = [
    {
      title: "Active agents",
      value: String(summary?.activeAgents ?? 12),
      change: "+1.4%",
      positive: true,
      description: "Compared to last week",
      icon: Bot,
    },
    {
      title: "Tasks in queue",
      value: String(summary?.tasksInQueue ?? 48),
      change: "+8%",
      positive: true,
      description: "Across imports and approvals",
      icon: Sparkles,
    },
    {
      title: "Avg. response",
      value: summary?.avgResponseTime ?? "1.8s",
      change: "-0.2s",
      positive: true,
      description: "Faster than your baseline",
      icon: TrendingUp,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6D5EF7]">Operations overview</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#172033]">
              Welcome back, Jane.
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-sm text-[#6D5EF7]">
            <CheckCircle2 className="h-4 w-4" />
            <span>Demo mode enabled</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label htmlFor="main-command" className="sr-only">
            Ask KaamAI a business question
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Bot className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                id="main-command"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask KaamAI to review invoices, summarize documents, or build a report…"
                className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 text-base shadow-none focus-visible:ring-[#6D5EF7]"
              />
            </div>
            <Button type="submit" className="h-14 rounded-2xl px-6 text-base shadow-sm">
              Ask KaamAI
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => navigate(`/assistant?q=${encodeURIComponent(item)}`)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-[#6D5EF7]"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            positive={stat.positive}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-[#172033]">Recent activity</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {activity.length} updates
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {activity.length > 0 ? (
              activity.slice(0, 5).map((item) => {
                const iconMap: Record<string, React.ElementType> = {
                  document: FileText,
                  import: FileUp,
                  approval: CheckCircle2,
                  report: BarChart3,
                };
                const Icon = iconMap[item.type] ?? FileText;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="rounded-lg bg-white p-2 text-[#6D5EF7] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#172033]">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.description}</div>
                    </div>
                    <div className="whitespace-nowrap text-xs text-slate-400">
                      {formatRelativeDate(item.timestamp)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No recent activity yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#172033]">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Button onClick={() => navigate("/assistant")} className="w-full justify-start gap-2 rounded-xl">
              <Bot className="h-4 w-4" />
              Open AI assistant
            </Button>
            <Button variant="outline" onClick={() => navigate("/documents")} className="w-full justify-start gap-2 rounded-xl">
              <Upload className="h-4 w-4" />
              Upload a document
            </Button>
            <Button variant="outline" onClick={() => navigate("/imports")} className="w-full justify-start gap-2 rounded-xl">
              <FileUp className="h-4 w-4" />
              Start CSV import
            </Button>
            <Button variant="outline" onClick={() => navigate("/reports")} className="w-full justify-start gap-2 rounded-xl">
              <BarChart3 className="h-4 w-4" />
              View reports
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#172033]">Recent documents</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/documents")}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentDocuments.length > 0 ? (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-[#6D5EF7] shadow-sm">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#172033]">{doc.name}</div>
                      <div className="text-xs text-slate-500">{formatBytes(doc.size)} • {formatRelativeDate(doc.uploadedAt)}</div>
                    </div>
                  </div>
                  <Badge
                    variant={doc.status === "indexed" ? "success" : doc.status === "error" ? "destructive" : "secondary"}
                    className="capitalize"
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No documents uploaded yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#172033]">Recent reports</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
              Open
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {recentReports.length > 0 ? (
              recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 text-[#14B8A6] shadow-sm">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#172033]">{report.title}</div>
                      <div className="text-xs text-slate-500">{report.type} • {formatRelativeDate(report.generatedAt)}</div>
                    </div>
                  </div>
                  <Badge variant={report.status === "ready" ? "success" : "secondary"}>
                    {report.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No reports generated yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">Workspace health</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 pt-0">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileText className="h-4 w-4 text-[#6D5EF7]" />
              Documents indexed
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#172033]">{summary?.documentsCount ?? 24}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <FileUp className="h-4 w-4 text-[#14B8A6]" />
              Imports processed
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#172033]">{summary?.importsCount ?? 6}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock3 className="h-4 w-4 text-amber-500" />
              Pending approvals
            </div>
            <div className="mt-3 text-2xl font-semibold text-[#172033]">{summary?.pendingApprovals ?? 3}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}