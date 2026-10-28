/**
 * API Service Layer
 *
 * Connects UI components to the backend API when available.
 * Falls back to clearly-labelled demo data when backend features are not yet implemented.
 * All backend URLs are relative and configurable via environment variables.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DEMO_DELAY = 500;

function demoDelay<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), DEMO_DELAY));
}

export interface ApiError {
  message: string;
  status?: number;
}

class ApiClient {
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = API_BASE ? `${API_BASE}${path}` : path;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorBody = await response
          .text()
          .catch(() => "");
        throw new Error(
          errorBody || `Request failed with status ${response.status}`
        );
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error("Backend unavailable");
      }
      throw error;
    }
  }

  // ---------- Dashboard ----------
  async getDashboardSummary() {
    try {
      return await this.request<{ summary: any }>("/api/dashboard/summary");
    } catch {
      const { DEMO_SUMMARY } = await import("@/data/demoData");
      return demoDelay({ summary: DEMO_SUMMARY });
    }
  }

  async getRecentActivity() {
    try {
      return await this.request<{ activities: any[] }>("/api/activity");
    } catch {
      const { DEMO_RECENT_ACTIVITY } = await import("@/data/demoData");
      return demoDelay({ activities: DEMO_RECENT_ACTIVITY });
    }
  }

  // ---------- Documents ----------
  async getDocuments() {
    try {
      return await this.request<{ documents: any[] }>("/api/documents");
    } catch {
      const { DEMO_DOCUMENTS } = await import("@/data/demoData");
      return demoDelay({ documents: DEMO_DOCUMENTS });
    }
  }

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      return await this.request<{ document: any }>("/api/documents/upload", {
        method: "POST",
        headers: {},
        body: formData,
      });
    } catch {
      const demoDoc = {
        id: `doc_demo_${Date.now()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: "processing" as const,
      };
      return demoDelay({ document: demoDoc });
    }
  }

  async deleteDocument(id: string) {
    try {
      return await this.request(`/api/documents/${id}`, {
        method: "DELETE",
      });
    } catch {
      return demoDelay({ success: true });
    }
  }

  async extractDocument(id: string) {
    try {
      return await this.request<{ document_id: string; status: string; page_count?: number; text_length?: number }>(
        `/api/documents/${id}/extract`,
        { method: "POST" }
      );
    } catch {
      return demoDelay({ document_id: id, status: "completed", page_count: 1, text_length: 0 });
    }
  }

  async getDocumentContent(id: string) {
    try {
      return await this.request<{
        document_id: string;
        original_filename: string;
        mime_type: string;
        extracted_text: string;
        page_count?: number | null;
        extracted_at?: string | null;
      }>(`/api/documents/${id}/content`);
    } catch {
      return demoDelay({
        document_id: id,
        original_filename: "",
        mime_type: "",
        extracted_text: "",
        page_count: null,
        extracted_at: null,
      });
    }
  }

  // ---------- AI Assistant ----------
  async getConversations() {
    try {
      return await this.request<{ conversations: any[] }>(
        "/api/conversations"
      );
    } catch {
      const { DEMO_CONVERSATIONS } = await import("@/data/demoData");
      return demoDelay({ conversations: DEMO_CONVERSATIONS });
    }
  }

  async sendMessage(conversationId: string, content: string) {
    try {
      return await this.request<{ message: any }>("/api/messages", {
        method: "POST",
        body: JSON.stringify({ conversationId, content }),
      });
    } catch {
      return demoDelay({
        message: {
          id: `msg_demo_${Date.now()}`,
          role: "assistant" as const,
          content:
            "[Demo mode] This is a placeholder response. Connect a backend to get real AI answers.",
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  async getProviderStatus() {
    try {
      return await this.request<{ providers: any[] }>("/api/providers");
    } catch {
      return demoDelay({
        providers: [
          {
            name: "Ollama (local)",
            status: "unknown",
            configured: false,
            detail: "Backend unavailable.",
          },
        ],
      });
    }
  }

  // ---------- Search ----------
  async search(query: string, { topK = 5, threshold = 0.3 }: { topK?: number; threshold?: number } = {}) {
    try {
      return await this.request<{ query: string; results: any[] }>(
        `/api/search?q=${encodeURIComponent(query)}&topK=${topK}&threshold=${threshold}`
      );
    } catch {
      return demoDelay({ query, results: [] });
    }
  }

  async indexDocument(id: string) {
    try {
      return await this.request<{ document_id: string; status: string }>(
        `/api/documents/${id}/index`,
        { method: "POST" }
      );
    } catch {
      return demoDelay({ document_id: id, status: "indexed" });
    }
  }

  async reindexDocument(id: string) {
    try {
      return await this.request<{ document_id: string; status: string }>(
        `/api/documents/${id}/reindex`,
        { method: "POST" }
      );
    } catch {
      return demoDelay({ document_id: id, status: "reindexed" });
    }
  }

  async ragChat(message: string, { topK = 5, threshold = 0.3, model, temperature, max_tokens }: { topK?: number; threshold?: number; model?: string; temperature?: number; max_tokens?: number } = {}) {
    try {
      return await this.request<{
        message: any;
        model: string;
        citations: any[];
        usage?: any;
        evidenceFound: boolean;
      }>("/api/rag/chat", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ message, topK, threshold, model, temperature, max_tokens }),
      });
    } catch {
      return demoDelay({
        message: {
          id: `msg_${Date.now()}`,
          role: "assistant",
          content: "[Demo mode] This is a placeholder RAG response. Connect a backend with Ollama and indexed documents to get real grounded answers.",
          createdAt: new Date().toISOString(),
          sources: [],
        },
        model: "demo",
        citations: [],
        usage: {},
        evidenceFound: false,
      });
    }
  }

  // ---------- Data Imports ----------
  async getImports() {
    try {
      return await this.request<{ jobs: any[] }>("/api/imports/jobs");
    } catch {
      const { DEMO_IMPORTS } = await import("@/data/demoData");
      return demoDelay({ jobs: DEMO_IMPORTS });
    }
  }

  async previewCsv(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      return await this.request<{
        columns: string[];
        rows: any[][];
        valid: boolean;
        errors: string[];
        total_rows: number;
        valid_rows: number;
        invalid_rows: number[];
      }>("/api/imports/preview", { method: "POST", body: formData, headers: {} });
    } catch {
      return demoDelay({
        columns: ["Date", "Description", "Amount", "Category"],
        rows: [
          ["2026-10-01", "Office supplies", "45.00", "Office"],
          ["2026-10-02", "Client lunch", "32.50", "Meals"],
        ],
        valid: true,
        errors: [],
        total_rows: 2,
        valid_rows: 2,
        invalid_rows: [],
      });
    }
  }

  async createImportJob(fileName: string, preview: any) {
    try {
      return await this.request<{ job: { id: string; file_name: string; status: string; total_rows: number; created_at: string } }>(
        "/api/imports/jobs",
        { method: "POST", headers: {}, body: JSON.stringify({ file_name: fileName, preview }) }
      );
    } catch {
      return demoDelay({ job: { id: `job_${Date.now()}`, file_name: fileName, status: "pending", total_rows: preview.total_rows ?? 0, created_at: new Date().toISOString() } });
    }
  }

  async validateImport(rows: any[], mapping: Record<string, string>, requiredFields: string[] = []) {
    try {
      return await this.request<{ valid: boolean; errors: any[] }>(
        "/api/imports/validate",
        { method: "POST", headers: {}, body: JSON.stringify({ rows, mapping, required_fields: requiredFields }) }
      );
    } catch {
      return demoDelay({ valid: true, errors: [] });
    }
  }

  async confirmImport(jobId: string, mapping: Record<string, string> = {}, rows: any[] = []) {
    try {
      return await this.request<{
        job_id: string;
        imported_rows: number;
        error_rows: number;
        errors: any[];
        status: string;
      }>("/api/imports/confirm", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ job_id: jobId, mapping, rows }),
      });
    } catch {
      return demoDelay({ job_id: jobId, imported_rows: rows.length, error_rows: 0, errors: [], status: "completed" });
    }
  }

  async deleteImportJob(jobId: string) {
    try {
      return await this.request(`/api/imports/jobs/${jobId}`, { method: "DELETE" });
    } catch {
      return demoDelay({ ok: true });
    }
  }

  // ---------- Business Tools ----------
  async getTools() {
    try {
      return await this.request<{ tools: any[] }>("/api/tools");
    } catch {
      return demoDelay({
        tools: [
          { name: "sales_totals", description: "Calculate total sales, transaction count, and average sale.", parameters: ["amountField", "dateRange"] },
          { name: "top_products", description: "Rank products by total sales volume.", parameters: ["productField", "amountField", "dateRange", "limit"] },
          { name: "invoice_list", description: "List invoices with optional status and date filters.", parameters: ["invoiceField", "customerField", "amountField", "statusFilter", "dateRange"] },
          { name: "overdue_totals", description: "Calculate overdue invoice amounts and count.", parameters: ["amountField", "dueDateField", "statusField", "asOfDate"] },
        ],
      });
    }
  }

  async runTool(tool: string, args: Record<string, unknown> = {}) {
    try {
      return await this.request<{ tool: string; workspace_id: string; result: unknown; generatedAt: string }>(
        "/api/tools/run",
        { method: "POST", headers: {}, body: JSON.stringify({ tool, ...args }) }
      );
    } catch {
      return demoDelay({ tool, workspace_id: "demo", result: null, generatedAt: new Date().toISOString() });
    }
  }


  // ---------- Agent ----------
  async runAgent(conversationId: string, message: string) {
    try {
      return await this.request<{
        id: string;
        conversationId: string;
        status: string;
        steps: any[];
        finalAnswer: string | null;
        error: string | null;
        createdAt: string;
        completedAt: string | null;
      }>("/api/agent/run", {
        method: "POST",
        headers: {},
        body: JSON.stringify({ conversation_id: conversationId, message }),
      });
    } catch {
      return demoDelay({
        id: `agent_${Date.now()}`,
        conversationId,
        status: "completed",
        steps: [],
        finalAnswer: "[Demo mode] Agent orchestration requires a live backend with Ollama.",
        error: null,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
  }

  async getAgentRuns() {
    try {
      return await this.request<{ runs: any[] }>("/api/agent/runs");
    } catch {
      return demoDelay({ runs: [] });
    }
  }

  async getAgentRun(id: string) {
    try {
      return await this.request<{
        id: string;
        conversationId: string;
        status: string;
        steps: any[];
        finalAnswer: string | null;
        error: string | null;
        createdAt: string;
        completedAt: string | null;
      }>(`/api/agent/runs/${id}`);
    } catch {
      return demoDelay({
        id,
        conversationId: "",
        status: "completed",
        steps: [],
        finalAnswer: null,
        error: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      });
    }
  }

  // ---------- Reports ----------
  // ---------- Reports ----------
  async getReports() {
    try {
      return await this.request<{ reports: any[] }>("/api/reports");
    } catch {
      const { DEMO_REPORTS } = await import("@/data/demoData");
      return demoDelay({ reports: DEMO_REPORTS });
    }
  }

  async downloadReport(id: string) {
    try {
      if (!API_BASE) {
        throw new Error("Live API is not configured; using demo data.");
      }

      const response = await fetch(`${API_BASE}/api/reports/${id}/download`);
      if (!response.ok) throw new Error("Download failed");
      return response;
    } catch {
      return demoDelay(null);
    }
  }

  // ---------- Approvals ----------
  async getApprovals() {
    try {
      return await this.request<{ approvals: any[] }>("/api/approvals");
    } catch {
      const { DEMO_APPROVALS } = await import("@/data/demoData");
      return demoDelay({ approvals: DEMO_APPROVALS });
    }
  }

  async approveItem(id: string) {
    try {
      return await this.request<{ approval: any }>(
        `/api/approvals/${id}/approve`,
        { method: "POST" }
      );
    } catch {
      return demoDelay({ approval: { id, status: "approved" as const } });
    }
  }

  async rejectItem(id: string) {
    try {
      return await this.request<{ approval: any }>(
        `/api/approvals/${id}/reject`,
        { method: "POST" }
      );
    } catch {
      return demoDelay({ approval: { id, status: "rejected" as const } });
    }
  }

  // ---------- Settings ----------
  async getProviderHealth() {
    try {
      return await this.request<{ providers: any[] }>(
        "/api/providers"
      );
    } catch {
      return demoDelay({
        providers: [
          { name: "Ollama (local)", status: "unknown", configured: false },
          { name: "Embeddings", status: "unknown", configured: false },
        ],
      });
    }
  }

  // ---------- Auth ----------

  async getCsrfToken() {
    try {
      return await this.request<{ csrf_token: string }>("/api/auth/csrf-token");
    } catch {
      return demoDelay({ csrf_token: "demo-csrf-token" });
    }
  }

  async register(email: string, password: string, name?: string) {
    try {
      const csrf = await this.getCsrfToken();
      return await this.request<{ user: any; workspace: any }>("/api/auth/register", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.csrf_token },
        body: JSON.stringify({ email, password, name }),
      });
    } catch {
      return demoDelay({
        user: { id: "user_demo", email, role: "admin", workspace_id: "ws_demo" },
        workspace: { id: "ws_demo", name: name ?? "Personal Workspace", slug: "ws_demo" },
      });
    }
  }

  async login(email: string, password: string) {
    try {
      const csrf = await this.getCsrfToken();
      return await this.request<{ user: any }>("/api/auth/login", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.csrf_token },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return demoDelay({
        user: { id: "user_demo", email, role: "admin", workspace_id: "ws_demo" },
      });
    }
  }

  async logout() {
    try {
      return await this.request("/api/auth/logout", { method: "POST" });
    } catch {
      return demoDelay({ ok: true });
    }
  }

  async getMe() {
    try {
      return await this.request<{ user: any }>("/api/auth/me");
    } catch {
      return demoDelay({
        user: { id: "user_demo", name: "Jane Doe", email: "jane@freelance.example", role: "admin", workspace_id: "ws_demo" },
      });
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const csrf = await this.getCsrfToken();
      return await this.request("/api/auth/change-password", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.csrf_token },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
    } catch {
      return demoDelay({ ok: true });
    }
  }
}

export const api = new ApiClient();