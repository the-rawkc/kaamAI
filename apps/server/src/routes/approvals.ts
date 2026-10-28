import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { findApprovalsByWorkspace, resolveApproval } from "../models/approval.js";

export function mountApprovalsRoutes(router: Router): void {
  router.get(
    "/api/approvals",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view approvals." },
          });
          return;
        }

        const approvals = await findApprovalsByWorkspace(user.workspace_id, { status: "pending" });

        response.json({
          approvals: approvals.map((a) => ({
            id: a.id,
            action: a.action,
            description: a.description,
            data: a.data,
            consequences: a.consequences,
            status: a.status,
            createdAt: a.created_at.toISOString(),
            requestedBy: user.email,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  const approveRejectSchema = z.object({
    id: z.string().uuid(),
  });

  router.post(
    "/api/approvals/:id/approve",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to approve actions." },
          });
          return;
        }

        const parsed = approveRejectSchema.safeParse({ id: request.params.id });
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid approval ID." },
          });
          return;
        }

        const approval = await resolveApproval(parsed.data.id, "approved", user.id);
        if (!approval) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Approval not found or already resolved." },
          });
          return;
        }

        response.json({ ok: true, approval: { id: approval.id, status: "approved" } });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  router.post(
    "/api/approvals/:id/reject",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to reject actions." },
          });
          return;
        }

        const parsed = approveRejectSchema.safeParse({ id: request.params.id });
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid approval ID." },
          });
          return;
        }

        const approval = await resolveApproval(parsed.data.id, "rejected", user.id);
        if (!approval) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Approval not found or already resolved." },
          });
          return;
        }

        response.json({ ok: true, approval: { id: approval.id, status: "rejected" } });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
