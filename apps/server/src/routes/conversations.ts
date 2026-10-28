import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import {
  createConversation,
  findConversationById,
  createMessage,
  findMessagesByConversation,
  deleteConversation,
} from "../models/conversation.js";

const conversationIdSchema = z.string().uuid("Invalid conversation ID.");

const createConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  content: z.string().min(1),
  sources: z.array(z.any()).optional(),
  toolCalls: z.array(z.any()).optional(),
});

export function mountConversationsRoutes(router: Router): void {
  // List conversations for the current user's workspace.
  // Conversations are derived from AI chat/audit log entries.
  router.get(
    "/api/conversations",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view conversations." },
          });
          return;
        }

        const result = await query(
          `SELECT DISTINCT ON (metadata->>'conversation_id')
                  id, action, metadata, created_at
           FROM audit_logs
           WHERE (metadata->>'user_id')::text = $1
             AND action IN ('ai_chat', 'rag_chat')
             AND metadata->>'conversation_id' IS NOT NULL
           ORDER BY (metadata->>'conversation_id') ASC, created_at DESC`,
          [user.id],
        );

        const rows = (
          result as {
            rows: Array<{ id: string; action: string; metadata: unknown; created_at: Date }>;
          }
        ).rows;

        response.json({
          conversations: rows.map((row) => {
            const meta =
              typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {};
            return {
              id: (meta as Record<string, unknown>).conversation_id ?? row.id,
              title: (meta as Record<string, unknown>).title ?? "Conversation",
              updatedAt: row.created_at.toISOString(),
              messageCount: 1,
              lastMessage: (meta as Record<string, unknown>).lastMessage ?? "",
            };
          }),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Create a new conversation.
  router.post(
    "/api/conversations",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to create a conversation." },
          });
          return;
        }

        const body = createConversationSchema.parse(request.body);
        const conversation = await createConversation({
          workspace_id: user.workspace_id,
          user_id: user.id,
          title: body.title,
        });

        response.status(201).json({
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updated_at.toISOString(),
          messageCount: 0,
          lastMessage: "",
        });
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

  // Get messages for a conversation.
  router.get(
    "/api/conversations/:id/messages",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view messages." },
          });
          return;
        }

        const parsed = conversationIdSchema.safeParse(request.params.id);
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid conversation ID." },
          });
          return;
        }

        const conversation = await findConversationById(parsed.data);
        if (!conversation) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Conversation not found." },
          });
          return;
        }

        if (conversation.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's conversation is not permitted.",
            },
          });
          return;
        }

        const messages = await findMessagesByConversation(parsed.data);

        response.json({
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.created_at.toISOString(),
            sources: m.sources,
            toolCalls: m.toolCalls,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Send a message to a conversation.
  router.post(
    "/api/conversations/:id/messages",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to send messages." },
          });
          return;
        }

        const parsed = conversationIdSchema.safeParse(request.params.id);
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid conversation ID." },
          });
          return;
        }

        const conversation = await findConversationById(parsed.data);
        if (!conversation) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Conversation not found." },
          });
          return;
        }

        if (conversation.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's conversation is not permitted.",
            },
          });
          return;
        }

        const body = createMessageSchema.parse(request.body);

        const userMessage = await createMessage({
          conversation_id: parsed.data,
          role: body.role,
          content: body.content,
          sources: body.sources,
          toolCalls: body.toolCalls,
        });

        response.status(201).json({
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.created_at.toISOString(),
          sources: userMessage.sources,
          toolCalls: userMessage.toolCalls,
        });
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

  // Delete a conversation.
  router.delete(
    "/api/conversations/:id",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to delete conversations." },
          });
          return;
        }

        const parsed = conversationIdSchema.safeParse(request.params.id);
        if (!parsed.success) {
          response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Invalid conversation ID." },
          });
          return;
        }

        const conversation = await findConversationById(parsed.data);
        if (!conversation) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Conversation not found." },
          });
          return;
        }

        if (conversation.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's conversation is not permitted.",
            },
          });
          return;
        }

        await deleteConversation(parsed.data);

        response.json({ ok: true });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
