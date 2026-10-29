import * as React from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId?: string;
  workspaceName: string;
  isActive: boolean;
  documentCount: number;
  conversationCount: number;
  createdAt: string;
}

interface WorkspaceData {
  workspace_id: string;
  workspace_name: string;
  slug: string;
  user_count: number;
  document_count: number;
  chunk_count: number;
  record_count: number;
  report_count: number;
  approval_count: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [metrics, setMetrics] = React.useState<any>(null);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = React.useState<WorkspaceData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"users" | "data">("users");
  const [notification, setNotification] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadAdminData = React.useCallback(async () => {
    try {
      const [overviewRes, usersRes, dataRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminUsers(),
        api.getAdminNumericalData(),
      ]);
      setMetrics(overviewRes.metrics);
      setUsers(usersRes.users || []);
      setWorkspaces(dataRes.workspaces || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setNotification({
        text: err instanceof Error ? err.message : "Error connecting to Admin services.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setNotification({ text: `User role successfully updated to ${newRole}`, type: "success" });
    } catch (err) {
      setNotification({ text: err instanceof Error ? err.message : "Failed to update role", type: "error" });
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.updateUserStatus(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
      );
      setNotification({
        text: `User account ${!currentStatus ? "activated" : "deactivated"}`,
        type: "success",
      });
    } catch (err) {
      setNotification({ text: err instanceof Error ? err.message : "Failed to update status", type: "error" });
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${userEmail}?`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotification({ text: `User ${userEmail} deleted`, type: "success" });
    } catch (err) {
      setNotification({ text: err instanceof Error ? err.message : "Failed to delete user", type: "error" });
    }
  };

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await api.recalculateAdminMetrics();
      await loadAdminData();
      setNotification({ text: "All numerical metrics recalculated from live database.", type: "success" });
    } catch (err) {
      setNotification({ text: "Recalculation error", type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading Admin Portal and numerical metrics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Admin Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-[#6D5EF7] text-white shadow-md shadow-violet-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
                Admin Management Portal
              </h1>
              <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Superuser Active
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Control registered users, adjust workspace roles, and monitor system numerical data.
            </p>
          </div>
        </div>

        <Button
          onClick={handleRecalculate}
          disabled={refreshing}
          variant="outline"
          className="gap-2 border-slate-200 hover:border-violet-300"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-[#6D5EF7]" : ""}`} />
          <span>Recalculate Metrics</span>
        </Button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            notification.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* System Numerical Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Users</span>
            <div className="rounded-lg bg-violet-50 p-2 text-[#6D5EF7]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-[#172033]">
            {metrics?.totalUsers ?? users.length}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Across {metrics?.totalWorkspaces ?? workspaces.length} workspaces
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sales Calculated</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-[#172033]">
            ${(metrics?.totalSales ?? 0).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            From {metrics?.totalRecords ?? 0} business ledger rows
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Overdue Invoices</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-[#172033]">
            {metrics?.overdueCount ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            ${(metrics?.overdueAmount ?? 0).toLocaleString()} pending collection
          </p>
        </Card>

        <Card className="border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Documents & Embeddings</span>
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-bold text-[#172033]">
            {metrics?.totalDocuments ?? 0} docs
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {metrics?.totalChunks ?? 0} vector chunks in pgvector
          </p>
        </Card>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === "users"
              ? "border-[#6D5EF7] text-[#6D5EF7] font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Control & Permissions ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-medium transition-all ${
            activeTab === "data"
              ? "border-[#6D5EF7] text-[#6D5EF7] font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Workspaces & Numerical Data Control ({workspaces.length})</span>
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === "users" && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-lg text-[#172033]">Registered Users</CardTitle>
              <CardDescription>
                Assign user roles (Admin, Owner, Manager, Analyst, Member) and toggle access.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200/60 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Workspace</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Data Ingested</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isCurrentUser = u.id === user?.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-[#6D5EF7]">
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-[#172033]">
                                  {u.name} {isCurrentUser && <span className="text-xs text-[#6D5EF7]">(You)</span>}
                                </div>
                                <div className="text-xs text-slate-400">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                            {u.workspaceName}
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={u.role}
                              disabled={isCurrentUser}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none"
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="analyst">Analyst</option>
                              <option value="member">Member</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                u.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  u.isActive ? "bg-emerald-500" : "bg-red-500"
                                }`}
                              />
                              {u.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {u.documentCount} docs • {u.conversationCount} chats
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {formatRelativeDate(u.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isCurrentUser && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleStatus(u.id, u.isActive)}
                                    className="h-8 text-xs gap-1"
                                    title={u.isActive ? "Deactivate User" : "Activate User"}
                                  >
                                    {u.isActive ? (
                                      <>
                                        <UserX className="h-3.5 w-3.5 text-amber-600" />
                                        <span>Suspend</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>Activate</span>
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="h-8 px-2 text-xs"
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                        No users match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Workspaces & Numerical Data Control */}
      {activeTab === "data" && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg text-[#172033]">
              Workspace Numerical Data Ledger
            </CardTitle>
            <CardDescription>
              Detailed breakdown of ingested documents, indexed knowledge chunks, reports, and financial records per tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200/60 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Workspace</th>
                    <th className="px-6 py-3.5">Slug</th>
                    <th className="px-6 py-3.5">Members</th>
                    <th className="px-6 py-3.5">Documents</th>
                    <th className="px-6 py-3.5">Vector Chunks</th>
                    <th className="px-6 py-3.5">Ledger Records</th>
                    <th className="px-6 py-3.5">Reports</th>
                    <th className="px-6 py-3.5">Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workspaces.map((w) => (
                    <tr key={w.workspace_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#172033]">
                        {w.workspace_name}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {w.slug}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700">
                        {w.user_count}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-[#6D5EF7]">
                        {w.document_count}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {w.chunk_count}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-emerald-600">
                        {w.record_count}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {w.report_count}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {w.approval_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
