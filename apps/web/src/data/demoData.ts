/**
 * DEMO DATA - Synthetic data used only when backend functionality is not available.
 * All data here is clearly labelled as demo and does not represent real user data.
 * Do not hard-code successful AI operations here; these are placeholders for UI scaffolding.
 */

import type {
  DemoData,
  Document,
  Conversation,
  RecentActivity,
  ImportJob,
  Report,
  ApprovalItem,
  BusinessSummary,
  User,
} from "@/types";

export const DEMO_USER: User = {
  id: "user_001",
  name: "Jane Doe",
  email: "jane@freelance.example",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
};

export const DEMO_SUMMARY: BusinessSummary = {
  activeAgents: 12,
  tasksInQueue: 48,
  avgResponseTime: "1.8s",
  documentsCount: 24,
  importsCount: 6,
  pendingApprovals: 3,
};

export const DEMO_DOCUMENTS: Document[] = [
  {
    id: "doc_001",
    name: "Q3_Invoice_Summary.pdf",
    type: "application/pdf",
    size: 1245000,
    uploadedAt: "2026-10-15T14:30:00Z",
    status: "indexed",
    pages: 12,
    chunkCount: 48,
    sourceUrl: "/documents/doc_001",
  },
  {
    id: "doc_002",
    name: "Client_Contract_Acme.pdf",
    type: "application/pdf",
    size: 890000,
    uploadedAt: "2026-10-14T09:15:00Z",
    status: "indexed",
    pages: 8,
    chunkCount: 32,
    sourceUrl: "/documents/doc_002",
  },
  {
    id: "doc_003",
    name: "expenses_2026.csv",
    type: "text/csv",
    size: 45000,
    uploadedAt: "2026-10-13T16:45:00Z",
    status: "indexed",
    chunkCount: 150,
    sourceUrl: "/documents/doc_003",
  },
  {
    id: "doc_004",
    name: "Project_Proposal_Website.txt",
    type: "text/plain",
    size: 12500,
    uploadedAt: "2026-10-12T11:20:00Z",
    status: "indexed",
    chunkCount: 5,
    sourceUrl: "/documents/doc_004",
  },
  {
    id: "doc_005",
    name: "Tax_Receipt_March.pdf",
    type: "application/pdf",
    size: 560000,
    uploadedAt: "2026-10-10T08:00:00Z",
    status: "error",
    error: "Failed to extract text from scanned pages.",
    sourceUrl: "/documents/doc_005",
  },
];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_001",
    title: "Q3 invoice review",
    updatedAt: "2026-10-16T09:00:00Z",
    messageCount: 14,
    lastMessage: "What are the outstanding invoices for Acme Corp?",
  },
  {
    id: "conv_002",
    title: "Expense categorization",
    updatedAt: "2026-10-15T16:30:00Z",
    messageCount: 8,
    lastMessage: "Categorize all expenses by vendor type.",
  },
  {
    id: "conv_003",
    title: "Contract renewal terms",
    updatedAt: "2026-10-14T11:00:00Z",
    messageCount: 6,
    lastMessage: "Summarize the renewal clause in the Acme contract.",
  },
];

export const DEMO_RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: "act_001",
    type: "document",
    title: "Q3_Invoice_Summary.pdf indexed",
    description: "48 chunks extracted and indexed.",
    timestamp: "2026-10-15T14:30:00Z",
    user: "Jane Doe",
  },
  {
    id: "act_002",
    type: "import",
    title: "expenses_2026.csv imported",
    description: "142 of 150 rows imported successfully.",
    timestamp: "2026-10-13T16:45:00Z",
    user: "Jane Doe",
  },
  {
    id: "act_003",
    type: "approval",
    title: "Email draft pending review",
    description: "Follow-up email to Acme Corp awaits your approval.",
    timestamp: "2026-10-13T09:15:00Z",
    user: "KaamAI Agent",
  },
  {
    id: "act_004",
    type: "report",
    title: "Monthly revenue report generated",
    description: "Q3 revenue summary downloaded.",
    timestamp: "2026-10-12T17:00:00Z",
    user: "Jane Doe",
  },
];

export const DEMO_IMPORTS: ImportJob[] = [
  {
    id: "imp_001",
    fileName: "expenses_2026.csv",
    status: "completed",
    totalRows: 150,
    importedRows: 142,
    errorRows: 8,
    createdAt: "2026-10-13T16:45:00Z",
    completedAt: "2026-10-13T16:48:00Z",
  },
  {
    id: "imp_002",
    fileName: "sales_q3.csv",
    status: "completed",
    totalRows: 89,
    importedRows: 89,
    errorRows: 0,
    createdAt: "2026-10-11T10:30:00Z",
    completedAt: "2026-10-11T10:32:00Z",
  },
  {
    id: "imp_003",
    fileName: "clients_partial.csv",
    status: "error",
    totalRows: 200,
    importedRows: 0,
    errorRows: 200,
    createdAt: "2026-10-09T14:00:00Z",
    completedAt: "2026-10-09T14:05:00Z",
  },
];

export const DEMO_REPORTS: Report[] = [
  {
    id: "rep_001",
    title: "Q3 Revenue Summary",
    type: "Revenue",
    generatedAt: "2026-10-12T17:00:00Z",
    downloadUrl: "/reports/rep_001/download",
    status: "ready",
  },
  {
    id: "rep_002",
    title: "Overdue Invoices Report",
    type: "Accounts Receivable",
    generatedAt: "2026-10-11T09:00:00Z",
    downloadUrl: "/reports/rep_002/download",
    status: "ready",
  },
  {
    id: "rep_003",
    title: "Expense Breakdown by Category",
    type: "Expenses",
    generatedAt: "2026-10-10T14:30:00Z",
    status: "ready",
  },
];

export const DEMO_APPROVALS: ApprovalItem[] = [
  {
    id: "appr_001",
    action: "Send follow-up email to Acme Corp",
    description: "Draft a polite follow-up regarding the unpaid Q3 invoice.",
    data: {
      recipient: "billing@acme.example",
      subject: "Follow-up: Q3 Invoice #INV-2026-044",
      preview:
        "Hi Acme billing team, this is a friendly reminder that invoice INV-2026-044 is now 7 days past due…",
    },
    consequences: [
      "An email will be sent to billing@acme.example",
      "The invoice status will be marked as 'follow-up sent'",
    ],
    status: "pending",
    createdAt: "2026-10-13T09:15:00Z",
    requestedBy: "KaamAI Agent",
  },
  {
    id: "appr_002",
    action: "Record expense: Office Supplies",
    description: "Categorize and record a $84.50 office supplies purchase.",
    data: {
      amount: 84.50,
      category: "Office Supplies",
      date: "2026-10-12",
      vendor: "Staples",
    },
    consequences: [
      "Expense will be added to Q4 expenses",
      "Monthly totals will be updated",
    ],
    status: "pending",
    createdAt: "2026-10-13T08:00:00Z",
    requestedBy: "KaamAI Agent",
  },
];

export const DEMO_DATA: DemoData = {
  user: DEMO_USER,
  summary: DEMO_SUMMARY,
  documents: DEMO_DOCUMENTS,
  conversations: DEMO_CONVERSATIONS,
  recentActivity: DEMO_RECENT_ACTIVITY,
  imports: DEMO_IMPORTS,
  reports: DEMO_REPORTS,
  approvals: DEMO_APPROVALS,
};