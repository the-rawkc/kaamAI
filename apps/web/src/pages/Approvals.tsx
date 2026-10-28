import * as React from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/services/api";
import { formatRelativeDate } from "@/lib/utils";
import type { ApprovalItem } from "@/types";

export default function Approvals() {
  const [approvals, setApprovals] = React.useState<ApprovalItem[]>([]);
  const [viewing, setViewing] = React.useState<ApprovalItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getApprovals();
        if (!cancelled) {
          setApprovals(response.approvals ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Approval items are temporarily unavailable.");
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

  const pendingApprovals = approvals.filter((approval) => approval.status === "pending");

  const handleApprove = async (id: string) => {
    setLoading(true);
    try {
      await api.approveItem(id);
      setSuccess("This action was approved and queued for execution.");
      const response = await api.getApprovals();
      setApprovals(response.approvals ?? []);
      setViewing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    try {
      await api.rejectItem(id);
      setSuccess("This action was rejected and will not run.");
      const response = await api.getApprovals();
      setApprovals(response.approvals ?? []);
      setViewing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading approvals…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">Approvals</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Review queued actions</h1>
        </div>

        <Badge variant={pendingApprovals.length > 0 ? "default" : "success"} className="rounded-full px-3 py-1.5">
          {pendingApprovals.length} pending
        </Badge>
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

      {viewing ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg text-[#172033]">Review action</CardTitle>
            </div>
            <Button type="button" variant="outline" onClick={() => setViewing(null)} className="rounded-xl">
              Back to list
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div>
              <div className="text-xl font-semibold text-[#172033]">{viewing.action}</div>
              <div className="mt-1 text-sm text-slate-500">{viewing.description}</div>
              <div className="mt-2 text-xs text-slate-400">Requested by {viewing.requestedBy} • {formatRelativeDate(viewing.createdAt)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Action data</div>
              <div className="space-y-2 text-sm">
                {Object.entries(viewing.data).map(([key, value]) => (
                  <div key={key} className="flex gap-3">
                    <span className="min-w-[110px] text-slate-500">{key}</span>
                    <span className="flex-1 text-[#172033]">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Consequences</div>
              <ul className="space-y-2 text-sm text-slate-600">
                {viewing.consequences.map((consequence) => (
                  <li key={consequence} className="flex items-start gap-2">
                    <ChevronRight className="mt-0.5 h-4 w-4 text-[#6D5EF7]" />
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void handleReject(viewing.id)} className="rounded-xl">
                Reject
              </Button>
              <Button type="button" onClick={() => void handleApprove(viewing.id)} className="rounded-xl">
                Approve & execute
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 pb-4">
          <CardTitle className="text-lg text-[#172033]">Pending actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Requested by</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((approval) => (
                    <tr key={approval.id} className="border-t border-slate-200 align-middle">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-violet-50 p-2 text-[#6D5EF7]">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#172033]">{approval.action}</div>
                            <div className="text-xs text-slate-500">{approval.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{approval.requestedBy}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatRelativeDate(approval.createdAt)}</td>
                      <td className="py-3">
                        <Button type="button" variant="outline" size="sm" onClick={() => setViewing(approval)} className="rounded-xl">
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-2 py-10 text-center text-slate-500">
                      No pending approvals.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}