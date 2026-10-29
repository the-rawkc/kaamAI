import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { Document, RecentActivity } from "@/types";

const SUGGESTED_PROMPTS = [
  "What are my outstanding invoices?",
  "Summarize the recent contract or policy document",
  "Calculate our total sales revenue",
  "Which products had the highest sales volume?",
  "List overdue client invoices with days past due",
];

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
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
      <CardContent className="space-y-1 pt-0">
        <div className="text-3xl font-semibold tracking-tight text-[#172033]">{value}</div>
        <p className="text-xs text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = React.useState<any>(null);
  const [activity, setActivity] = React.useState<RecentActivity[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
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
          setActivity(activityRes.activities || []);
          setDocuments(documentsRes.documents || []);
          setReports(reportsRes.reports || []);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
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

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const workspaceName = summary?.workspaceName || "Enterprise Workspace";
  const recentDocuments = documents.slice(0, 3);
  const recentReports = reports.slice(0, 2);

  const stats = [
    {
      title: "Documents Uploaded",
      value: summary?.documentCount ?? documents.length,
      description: "PDFs and business spreadsheets indexed",
      icon: FileText,
    },
    {
      title: "Knowledge Chunks",
      value: summary?.chunkCount ?? 0,
      description: "768-dim embeddings in pgvector",
      icon: Database,
    },
    {
      title: "Active Conversations",
      value: summary?.conversationCount ?? 0,
      description: "Grounded RAG & AI dialogues",
      icon: Bot,
    },
    {
      title: "Pending Approvals",
      value: summary?.pendingApprovalsCount ?? 0,
      description: "Human-in-the-loop actions awaiting signoff",
      icon: Clock3,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading your workspace metrics…</p>
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
              Welcome back, {displayName}.
            </h1>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>{workspaceName}</span>
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
                placeholder="Ask KaamAI to review invoices, summarize documents, or calculate sales…"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#172033]">Recent activity</CardTitle>
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
                No recent activity yet. Upload a document or run an AI prompt to see real-time updates here.
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
            <Button variant="outline" onClick={() => navigate("/docs")} className="w-full justify-start gap-2 rounded-xl border-violet-200 bg-violet-50/50 text-[#6D5EF7] hover:bg-violet-100/60">
              <BookOpen className="h-4 w-4" />
              User Guide & Documentation
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
                No documents uploaded yet. Go to Documents to upload your first PDF or CSV file.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#172033]">Recent reports</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
              View all
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
                No reports generated yet. Use the Assistant or Reports page to create your first report.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
