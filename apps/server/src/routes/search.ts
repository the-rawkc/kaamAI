import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { embeddingService } from "../services/embedding-service.js";
import { findDocumentById } from "../models/document.js";
import { query } from "../db/connection.js";

const searchSchema = z.object({
  query: z.string().min(1, "Search query cannot be empty.").max(1000, "Query too long."),
  topK: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.3),
});

export function mountSearchRoutes(router: Router): void {
  // Semantic search across workspace documents.
  router.get(
    "/api/search",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to search." },
          });
          return;
        }

        const params = searchSchema.parse({
          query: request.query.q,
          topK: request.query.topK ? Number(request.query.topK) : undefined,
          threshold: request.query.threshold ? Number(request.query.threshold) : undefined,
        });

        const results = await embeddingService.search(user.workspace_id, params.query, {
          topK: params.topK,
          threshold: params.threshold,
        });

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "semantic_search",
          JSON.stringify({ query: params.query, result_count: results.length }),
        ]);

        response.json({
          query: params.query,
          results,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          response.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: error.issues[0]?.message ?? "Invalid search parameters.",
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

  // Index a document: generate chunks and embeddings.
  router.post(
    "/api/documents/:id/index",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to index documents." },
          });
          return;
        }

        const documentId =
          typeof request.params.id === "string"
            ? request.params.id
            : String(request.params.id?.[0]);
        const document = await findDocumentById(documentId);
        if (!document) {
          response
            .status(404)
            .json({ error: { code: "NOT_FOUND", message: "Document not found." } });
          return;
        }

        if (document.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's document is not permitted.",
            },
          });
          return;
        }

        await embeddingService.indexDocument(documentId);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_indexed",
          JSON.stringify({ document_id: documentId }),
        ]);

        response.json({
          document_id: documentId,
          status: "indexed",
        });
      } catch (error) {
        if (error instanceof Error) {
          response.status(422).json({
            error: { code: "INDEX_FAILED", message: error.message },
          });
          return;
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Re-index a document (replace existing chunks).
  router.post(
    "/api/documents/:id/reindex",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to re-index documents." },
          });
          return;
        }

        const documentId =
          typeof request.params.id === "string"
            ? request.params.id
            : String(request.params.id?.[0]);
        const document = await findDocumentById(documentId);
        if (!document) {
          response
            .status(404)
            .json({ error: { code: "NOT_FOUND", message: "Document not found." } });
          return;
        }

        if (document.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's document is not permitted.",
            },
          });
          return;
        }

        await embeddingService.reindexDocument(documentId);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_reindexed",
          JSON.stringify({ document_id: documentId }),
        ]);

        response.json({
          document_id: documentId,
          status: "reindexed",
        });
      } catch (error) {
        if (error instanceof Error) {
          response.status(422).json({
            error: { code: "REINDEX_FAILED", message: error.message },
          });
          return;
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
