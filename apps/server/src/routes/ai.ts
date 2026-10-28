import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { getAiProvider, getAllProvidersHealth } from "../services/ai-factory.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import { ragService } from "../services/rag-service.js";
import { aiLimiter } from "../middleware/rate-limit.js";

const chatSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().min(1, "Message cannot be empty.").max(4000, "Message too long."),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
});

const ragChatSchema = z.object({
  message: z.string().min(1, "Message cannot be empty.").max(4000, "Message too long."),
  topK: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.3),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4000).optional(),
});

export function mountAiRoutes(router: Router): void {
  router.get("/api/providers", async (_request: Request, response: Response) => {
    try {
      const providers = await getAllProvidersHealth();
      response.json({
        providers,
      });
    } catch {
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
      });
    }
  });

  router.post(
    "/api/chat",
    aiLimiter,
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to use the assistant." },
          });
          return;
        }

        const body = chatSchema.parse(request.body);

        const adapter = getAiProvider();
        const health = await adapter.health();
        if (health.status !== "ok") {
          response.status(503).json({
            error: {
              code: "AI_PROVIDER_UNAVAILABLE",
              message: `AI provider (${adapter.name}) is not ready: ${health.detail ?? "Check provider configuration."}`,
              detail: health.detail,
            },
          });
          return;
        }

        const messages = [
          {
            role: "system" as const,
            content:
              "You are KaamAI, a helpful local-first AI operations assistant for freelancers and small businesses. Answer based on the user's own uploaded documents when relevant. Be concise and honest. If you don't have enough information, say so rather than making things up.",
          },
          { role: "user" as const, content: body.message },
        ];

        const result = await adapter.chat(messages, {
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.max_tokens,
        });

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "ai_chat",
          JSON.stringify({ model: result.model, message_length: body.message.length }),
        ]);

        response.json({
          message: {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: result.content,
            createdAt: new Date().toISOString(),
          },
          model: result.model,
          usage: result.usage,
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
        if (error instanceof Error) {
          if (error.message.includes("timed out")) {
            response.status(504).json({
              error: { code: "AI_PROVIDER_TIMEOUT", message: error.message },
            });
            return;
          }
          if (error.message.includes("Ollama")) {
            response.status(502).json({
              error: { code: "AI_PROVIDER_ERROR", message: error.message },
            });
            return;
          }
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // RAG chat: retrieve relevant document chunks, ground the answer, return citations.
  router.post(
    "/api/rag/chat",
    aiLimiter,
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to use RAG chat." },
          });
          return;
        }

        const body = ragChatSchema.parse(request.body);

        const adapter = getAiProvider();
        const health = await adapter.health();
        if (health.status !== "ok") {
          response.status(503).json({
            error: {
              code: "AI_PROVIDER_UNAVAILABLE",
              message: `AI provider (${adapter.name}) is not ready: ${health.detail ?? "Check provider configuration."}`,
              detail: health.detail,
            },
          });
          return;
        }

        const ragResult = await ragService.answerQuestion(user.workspace_id, body.message, {
          topK: body.topK,
          threshold: body.threshold,
          model: body.model,
          temperature: body.temperature,
          maxTokens: body.max_tokens,
        });

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "rag_chat",
          JSON.stringify({
            model: ragResult.model,
            evidenceFound: ragResult.evidenceFound,
            citation_count: ragResult.citations.length,
            message_length: body.message.length,
          }),
        ]);

        response.json({
          message: {
            id: `msg_${Date.now()}`,
            role: "assistant",
            content: ragResult.answer,
            createdAt: new Date().toISOString(),
            sources: ragResult.citations.map((c) => ({
              documentId: c.documentId,
              documentName: c.documentName,
              page: c.page,
              chunkIndex: c.chunkIndex,
              snippet: c.snippet,
            })),
          },
          model: ragResult.model,
          citations: ragResult.citations,
          usage: ragResult.usage,
          evidenceFound: ragResult.evidenceFound,
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
        if (error instanceof Error) {
          if (error.message.includes("timed out")) {
            response.status(504).json({
              error: { code: "AI_PROVIDER_TIMEOUT", message: error.message },
            });
            return;
          }
          if (error.message.includes("Ollama")) {
            response.status(502).json({
              error: { code: "AI_PROVIDER_ERROR", message: error.message },
            });
            return;
          }
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
