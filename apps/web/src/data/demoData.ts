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
  id: "user_default",
  name: "Workspace Member",
  email: "user@example.com",
};

export const DEMO_SUMMARY: BusinessSummary = {
  activeAgents: 0,
  tasksInQueue: 0,
  avgResponseTime: "0.0s",
  documentsCount: 0,
  importsCount: 0,
  pendingApprovals: 0,
};

export const DEMO_DOCUMENTS: Document[] = [];
export const DEMO_CONVERSATIONS: Conversation[] = [];
export const DEMO_RECENT_ACTIVITY: RecentActivity[] = [];
export const DEMO_IMPORTS: ImportJob[] = [];
export const DEMO_REPORTS: Report[] = [];
export const DEMO_APPROVALS: ApprovalItem[] = [];

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
