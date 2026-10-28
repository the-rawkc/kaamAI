import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { agentOrchestrator } from "../services/agent.js";
import {
  createAgentRun,
  findAgentRunById,
  findAgentRunsByWorkspace,
  updateAgentRunStatus,
} from "../models/agent.js";
import { query } from "../db/connection.js";
import { aiLimiter } from "../middleware/rate-limit.js";

const agentRunIdSchema = z.string().uuid("Invalid agent run ID.");

const runAgentSchema = z.object({
  conversation_id: z.string().uuid("Invalid conversation ID."),
  message: z.string().min(1, "Message cannot be empty.").max(4000, "Message too long."),
});

export function mountAgentRoutes(router: Router): void {
  // Run an agent: orchestrate tool-calling steps to answer a user message.
  router.post(
    "/api/agent/run",
    aiLimiter,
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to run the agent." },
          });
          return;
        }

        const body = runAgentSchema.parse(request.body);

        // Verify the conversation belongs to the user's workspace.
        const conversationResult = await query(
          `SELECT id FROM conversations WHERE id = $1 AND workspace_id = $2`,
          [body.conversation_id, user.workspace_id],
        );
        const rows = (conversationResult as { rows: { id: string }[] }).rows;
        if (rows.length === 0) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Conversation not found in your workspace." },
          });
          return;
        }

        // Persist the agent run as pending before executing.
        const pendingRun = await createAgentRun({
          conversation_id: body.conversation_id,
          user_id: user.id,
          workspace_id: user.workspace_id,
          message: body.message,
          steps: [],
          final_answer: null,
          status: "pending",
        });

        try {
          const run = await agentOrchestrator.run(
            body.conversation_id,
            user.id,
            user.workspace_id,
            body.message,
          );

          await updateAgentRunStatus(
            run.id,
            run.status,
            run.finalAnswer ?? null,
            run.error ?? null,
            user.workspace_id,
          );

          response.status(201).json({
            id: run.id,
            conversationId: run.conversationId,
            status: run.status,
            steps: run.steps.map((s) => ({
              step: s.step,
              tool: s.tool,
              input: s.input,
              output: s.output,
              status: s.status,
              error: s.error,
            })),
            finalAnswer: run.finalAnswer,
            error: run.error,
            createdAt: run.createdAt.toISOString(),
            completedAt: run.completedAt?.toISOString() ?? null,
          });
        } catch (error) {
          await updateAgentRunStatus(
            pendingRun.id,
            "error",
            null,
            error instanceof Error ? error.message : "Agent execution failed.",
            user.workspace_id,
          );
          response.status(500).json({
            error: {
              code: "AGENT_ERROR",
              message: error instanceof Error ? error.message : "Agent execution failed.",
            },
          });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          response.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: error.issues[0]?.message ?? "Invalid input.",
            },
          });
          return;
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Get a specific agent run by ID.
  router.get(
    "/api/agent/runs/:id",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view agent runs." },
          });
          return;
        }

        const parsed = agentRunIdSchema.safeParse(request.params.id);
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid agent run ID." },
          });
          return;
        }

        const run = await findAgentRunById(parsed.data, user.workspace_id);
        if (!run) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Agent run not found." },
          });
          return;
        }

        if (run.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's agent run is not permitted.",
            },
          });
          return;
        }

        response.json({
          id: run.id,
          conversationId: run.conversation_id,
          status: run.status,
          steps: run.steps.map((s) => ({
            step: s.step,
            tool: s.tool,
            input: s.input,
            output: s.output,
            status: s.status,
            error: s.error,
          })),
          finalAnswer: run.final_answer,
          error: run.error,
          createdAt: run.created_at.toISOString(),
          completedAt: run.completed_at?.toISOString() ?? null,
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // List agent runs for the current workspace.
  router.get(
    "/api/agent/runs",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view agent runs." },
          });
          return;
        }

        const runs = await findAgentRunsByWorkspace(user.workspace_id, { limit: 50 });

        response.json({
          runs: runs.map((r) => ({
            id: r.id,
            conversationId: r.conversation_id,
            status: r.status,
            message: r.message,
            finalAnswer: r.final_answer,
            error: r.error,
            stepCount: r.steps.length,
            createdAt: r.created_at.toISOString(),
            completedAt: r.completed_at?.toISOString() ?? null,
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
