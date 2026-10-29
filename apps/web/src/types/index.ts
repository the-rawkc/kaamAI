export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  workspace_id?: string;
  avatarUrl?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  status: "pending" | "processing" | "indexed" | "error";
  pages?: number;
  chunkCount?: number;
  error?: string;
  sourceUrl?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  sources?: Citation[];
  toolCalls?: ToolCall[];
}

export interface Citation {
  documentId: string;
  documentName: string;
  page?: number;
  chunkIndex?: number;
  snippet: string;
}

export interface ToolCall {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BusinessSummary {
  activeAgents: number;
  tasksInQueue: number;
  avgResponseTime: string;
  documentsCount: number;
  importsCount: number;
  pendingApprovals: number;
  chunkCount?: number;
  reportCount?: number;
  workspaceName?: string;
}

export interface RecentActivity {
  id: string;
  type: "document" | "import" | "approval" | "report";
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: "pending" | "mapping" | "validating" | "importing" | "completed" | "error";
  totalRows: number;
  importedRows: number;
  errorRows: number;
  createdAt: string;
  completedAt?: string;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  downloadUrl?: string;
  status: "ready" | "generating" | "error";
}

export interface ApprovalItem {
  id: string;
  action: string;
  description: string;
  data: Record<string, unknown>;
  consequences: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  requestedBy: string;
}

export interface DemoData {
  user: User;
  summary: BusinessSummary;
  documents: Document[];
  conversations: Conversation[];
  recentActivity: RecentActivity[];
  imports: ImportJob[];
  reports: Report[];
  approvals: ApprovalItem[];
}

export const IS_DEMO_DATA = false;
