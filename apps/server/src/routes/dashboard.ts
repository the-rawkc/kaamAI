import { type Request, type Response, type Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import { countDocumentsByWorkspace } from "../models/document.js";

export function mountDashboardRoutes(router: Router): void {
  // Workspace dashboard summary: aggregated counts for dashboard stat cards.
  router.get(
    "/api/dashboard/summary",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view dashboard summary." },
          });
          return;
        }

        const documentsCount = await countDocumentsByWorkspace(user.workspace_id);

        // Import count from import_jobs table.
        const importResult = await query(
          `SELECT COUNT(*)::text AS count FROM import_jobs WHERE workspace_id = $1`,
          [user.workspace_id],
        );
        const importsCount = parseInt(
          (importResult as { rows: { count: string }[] }).rows[0].count,
          10,
        );

        // Pending approvals count from audit logs (approval actions not yet resolved).
        // We approximate via distinct approval-related audit entries without a dedicated table.
        const activityResult = await query(
          `SELECT action, COUNT(*)::text AS count FROM audit_logs
           WHERE user_id = $1
           GROUP BY action
           ORDER BY MAX(created_at) DESC
           LIMIT 10`,
          [user.id],
        );
        const activities = (
          activityResult as { rows: { action: string; count: string }[] }
        ).rows.map((row) => ({
          action: row.action,
          count: parseInt(row.count, 10),
        }));

        response.json({
          summary: {
            documentsCount,
            importsCount,
            pendingApprovals: activities
              .filter((a) => a.action.includes("approve") || a.action.includes("approval"))
              .reduce((acc, a) => acc + a.count, 0),
            activeAgents: 0,
            tasksInQueue: 0,
            avgResponseTime: "0s",
          },
          activities: activities.map((a) => ({
            id: `${a.action}-${Date.now()}`,
            type: "document" as const,
            title: a.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            description: `${a.count} event(s) recorded`,
            timestamp: new Date().toISOString(),
            user: user.email,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Recent workspace activity: latest audit log entries.
  router.get(
    "/api/activity",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view activity." },
          });
          return;
        }

        const limit = Math.min(Number(request.query.limit ?? 20), 100);
        const result = await query(
          `SELECT id, action, metadata, created_at
           FROM audit_logs
           WHERE user_id = $1 OR (metadata->>'workspace_id')::text = $2
           ORDER BY created_at DESC
           LIMIT $3`,
          [user.id, user.workspace_id, limit],
        );

        const rows = (
          result as {
            rows: Array<{ id: string; action: string; metadata: unknown; created_at: Date }>;
          }
        ).rows;

        response.json({
          activities: rows.map((row) => ({
            id: row.id,
            type: "document" as const,
            title: row.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            description:
              typeof row.metadata === "string" ? row.metadata : JSON.stringify(row.metadata ?? {}),
            timestamp: row.created_at.toISOString(),
            user: user.email,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
