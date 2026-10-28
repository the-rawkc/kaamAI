import * as React from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/services/api";
import { formatRelativeDate } from "@/lib/utils";
import type { Report } from "@/types";

export default function Reports() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getReports();
        if (!cancelled) {
          setReports(response.reports ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Your report library is not available right now.");
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

  const handleDownload = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.downloadReport(id);
      if (!response) {
        throw new Error("No report file was returned.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "kaamai-report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccess("Report downloaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The report could not be downloaded.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">Reports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Generated insights</h1>
        </div>

        <Button variant="outline" className="rounded-xl" disabled>
          Generate report
          <span className="ml-2 text-xs text-slate-400">coming later</span>
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
          <span>{success}</span>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-lg text-[#172033]">Available reports</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-3 font-medium">Report</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Generated</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <tr key={report.id} className="border-t border-slate-200 align-middle">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-violet-50 p-2 text-[#6D5EF7]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#172033]">{report.title}</div>
                            <div className="text-xs text-slate-500">{report.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{report.type}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={report.status === "ready" ? "success" : report.status === "error" ? "destructive" : "secondary"}>
                          {report.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{formatRelativeDate(report.generatedAt)}</td>
                      <td className="py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDownload(report.id)}
                          disabled={report.status !== "ready" || loading}
                          className="rounded-xl"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-2 py-10 text-center text-slate-500">
                      No reports are available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">Suggested report types</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          {['Revenue Summary', 'Overdue Invoices', 'Expense Breakdown'].map((reportType) => (
            <Button key={reportType} type="button" variant="outline" className="rounded-xl" disabled>
              {reportType}
              <span className="ml-2 text-xs text-slate-400">coming later</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
