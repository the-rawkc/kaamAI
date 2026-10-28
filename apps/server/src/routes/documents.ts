import { type NextFunction, type Request, type Response, type Router } from "express";
import multer from "multer";
import { z } from "zod";
import { basename, extname } from "node:path";
import { unlink, writeFile, readFile } from "node:fs/promises";
import {
  createDocument,
  findDocumentById,
  findDocumentsByWorkspace,
  updateDocumentStatus,
  updateDocumentContent,
  deleteDocument,
  countDocumentsByWorkspace,
  totalFileSizeByWorkspace,
} from "../models/document.js";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import {
  ensureStorageDir,
  generateStorageKey,
  isSupportedMimeType,
  isSupportedExtension,
  MAX_FILE_SIZE,
  PER_WORKSPACE_QUOTA,
  storagePathFor,
} from "../storage/index.js";
import { extractText } from "../services/extraction.js";
import { uploadLimiter } from "../middleware/rate-limit.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 1 },
});

const UUID_SCHEMA = z.string().uuid();

function uploadSingleFile(request: Request, response: Response, next: NextFunction): void {
  upload.single("file")(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      response.status(tooLarge ? 413 : 400).json({
        error: {
          code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
          message: tooLarge
            ? `File exceeds ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB limit.`
            : "The upload must contain exactly one file.",
        },
      });
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
}

function csrfCheck(request: Request): boolean {
  const token = request.headers["x-csrf-token"];
  const cookieToken = request.cookies?.csrf_token;
  return typeof token === "string" && typeof cookieToken === "string" && token === cookieToken;
}

function requireCsrf(request: Request, response: Response, next: NextFunction): void {
  if (!csrfCheck(request)) {
    response.status(403).json({
      error: { code: "CSRF_MISMATCH", message: "CSRF token mismatch." },
    });
    return;
  }
  next();
}

function parseDocumentId(request: Request, response: Response): string | null {
  const result = UUID_SCHEMA.safeParse(request.params.id);
  if (!result.success) {
    response.status(400).json({
      error: { code: "INVALID_DOCUMENT_ID", message: "Document ID must be a valid UUID." },
    });
    return null;
  }
  return result.data;
}

function safeOriginalFilename(filename: string): string {
  return [...basename(filename.replaceAll("\\", "/"))]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim()
    .slice(0, 255);
}

export function validateUploadedFile(
  file: Pick<Express.Multer.File, "originalname" | "mimetype" | "buffer">,
): string | null {
  const filename = safeOriginalFilename(file.originalname);
  const extension = extname(filename).toLowerCase();
  if (file.buffer.length === 0) return "The uploaded file is empty.";
  if (!filename || !isSupportedExtension(filename)) {
    return "Unsupported file extension. Supported: .pdf, .txt, .csv.";
  }

  const allowedMimeTypes: Record<string, string[]> = {
    ".pdf": ["application/pdf"],
    ".txt": ["text/plain"],
    ".csv": ["text/csv", "text/plain"],
  };
  if (
    !isSupportedMimeType(file.mimetype) ||
    !allowedMimeTypes[extension]?.includes(file.mimetype.toLowerCase())
  ) {
    return "File type does not match its extension. Supported: PDF, TXT, CSV.";
  }

  if (extension === ".pdf") {
    if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return "The uploaded file does not have a valid PDF signature.";
    }
  } else {
    if (file.buffer.includes(0)) return "Text and CSV files must not contain binary data.";
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
    } catch {
      return "Text and CSV files must use valid UTF-8 encoding.";
    }
  }

  return null;
}

export function mountDocumentRoutes(router: Router): void {
  router.post(
    "/api/documents/upload",
    uploadLimiter,
    requireAuth as unknown as (req: Request, res: Response) => void,
    requireCsrf,
    uploadSingleFile,
    async (request: AuthenticatedRequest, response: Response) => {
      let persistedPath: string | undefined;
      let documentId: string | undefined;
      try {
        const user = request.user;
        if (!user) {
          response
            .status(401)
            .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to upload files." } });
          return;
        }

        const file = request.file;
        if (!file) {
          response
            .status(400)
            .json({ error: { code: "NO_FILE", message: "No file was uploaded." } });
          return;
        }

        const validationError = validateUploadedFile(file);
        if (validationError) {
          response.status(400).json({
            error: { code: "INVALID_FILE", message: validationError },
          });
          return;
        }

        const originalFilename = safeOriginalFilename(file.originalname);

        const totalSize = await totalFileSizeByWorkspace(user.workspace_id);
        if (totalSize + file.size > PER_WORKSPACE_QUOTA) {
          response.status(413).json({
            error: {
              code: "QUOTA_EXCEEDED",
              message: "Workspace upload quota would be exceeded.",
            },
          });
          return;
        }

        ensureStorageDir();
        const storageKey = generateStorageKey();
        const storagePath = storagePathFor(storageKey);
        await writeFile(storagePath, file.buffer, { flag: "wx", mode: 0o600 });
        persistedPath = storagePath;

        const document = await createDocument({
          workspace_id: user.workspace_id,
          user_id: user.id,
          original_filename: originalFilename,
          storage_key: storageKey,
          storage_path: storagePath,
          mime_type: file.mimetype,
          file_size: file.size,
        });
        documentId = document.id;

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_uploaded",
          JSON.stringify({
            document_id: document.id,
            filename: document.original_filename,
            size: document.file_size,
          }),
        ]);

        response.status(201).json({
          document: {
            id: document.id,
            original_filename: document.original_filename,
            storage_key: document.storage_key,
            mime_type: document.mime_type,
            file_size: document.file_size,
            status: document.status,
            created_at: document.created_at,
          },
        });
      } catch {
        if (documentId) {
          await deleteDocument(documentId).catch(() => undefined);
        }
        if (persistedPath) await unlink(persistedPath).catch(() => undefined);
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.get(
    "/api/documents",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response
            .status(401)
            .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to list documents." } });
          return;
        }

        const parsedLimit = Number(request.query.limit ?? 50);
        const parsedOffset = Number(request.query.offset ?? 0);
        if (
          !Number.isInteger(parsedLimit) ||
          parsedLimit < 1 ||
          !Number.isInteger(parsedOffset) ||
          parsedOffset < 0
        ) {
          response.status(400).json({
            error: {
              code: "INVALID_PAGINATION",
              message: "Limit and offset must be valid integers.",
            },
          });
          return;
        }
        const limit = Math.min(parsedLimit, 100);
        const offset = parsedOffset;

        const documents = await findDocumentsByWorkspace(user.workspace_id, { limit, offset });
        const count = await countDocumentsByWorkspace(user.workspace_id);

        response.json({
          documents: documents.map((d) => ({
            id: d.id,
            original_filename: d.original_filename,
            mime_type: d.mime_type,
            file_size: d.file_size,
            status: d.status,
            error_message: d.error_message,
            created_at: d.created_at,
            updated_at: d.updated_at,
          })),
          total: count,
          limit,
          offset,
        });
      } catch {
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.get(
    "/api/documents/:id",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view document details." },
          });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        response.json({
          document: {
            id: document.id,
            original_filename: document.original_filename,
            storage_key: document.storage_key,
            mime_type: document.mime_type,
            file_size: document.file_size,
            status: document.status,
            error_message: document.error_message,
            created_at: document.created_at,
            updated_at: document.updated_at,
          },
        });
      } catch {
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.delete(
    "/api/documents/:id",
    requireAuth as unknown as (req: Request, res: Response) => void,
    requireCsrf,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response
            .status(401)
            .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to delete documents." } });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        // Delete the physical file from storage
        await unlink(storagePathFor(document.storage_key)).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });

        // Delete the document record
        await deleteDocument(document.id);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_deleted",
          JSON.stringify({ document_id: document.id, filename: document.original_filename }),
        ]);

        response.json({ ok: true });
      } catch {
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.post(
    "/api/documents/:id/reindex",
    requireAuth as unknown as (req: Request, res: Response) => void,
    requireCsrf,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response
            .status(401)
            .json({ error: { code: "UNAUTHENTICATED", message: "Sign in to reindex documents." } });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        await updateDocumentStatus(document.id, "uploaded", null);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_reindexed",
          JSON.stringify({ document_id: document.id }),
        ]);

        response.json({ ok: true });
      } catch {
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.get(
    "/api/documents/:id/status",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to check document status." },
          });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        response.json({
          document_id: document.id,
          status: document.status,
          error_message: document.error_message,
          updated_at: document.updated_at,
        });
      } catch {
        response.status(500).json({
          error: {
            code: "INTERNAL_ERROR",
            message: "The server could not complete this request.",
          },
        });
      }
    },
  );

  router.post(
    "/api/documents/:id/extract",
    requireAuth as unknown as (req: Request, res: Response) => void,
    requireCsrf,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to extract document text." },
          });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        await updateDocumentStatus(document.id, "processing");

        let buffer: Buffer;
        try {
          buffer = await readFile(document.storage_path);
        } catch {
          buffer = Buffer.alloc(0);
        }

        const result = await extractText(buffer, document.mime_type, document.original_filename);

        if (result.error) {
          await updateDocumentStatus(document.id, "failed", result.error);
          response
            .status(422)
            .json({ error: { code: "EXTRACTION_FAILED", message: result.error } });
          return;
        }

        await updateDocumentContent(document.id, result.text, result.pageCount ?? null);
        await updateDocumentStatus(document.id, "completed");

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "document_extracted",
          JSON.stringify({ document_id: document.id, page_count: result.pageCount }),
        ]);

        response.json({
          document_id: document.id,
          status: "completed",
          page_count: result.pageCount,
          text_length: result.text?.length ?? 0,
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  router.get(
    "/api/documents/:id/content",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view document content." },
          });
          return;
        }

        const documentId = parseDocumentId(request, response);
        if (!documentId) return;
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

        if (document.status !== "completed" || !document.extracted_text) {
          response.status(400).json({
            error: {
              code: "CONTENT_NOT_AVAILABLE",
              message: "Extracted content is not available for this document.",
            },
          });
          return;
        }

        response.json({
          document_id: document.id,
          original_filename: document.original_filename,
          mime_type: document.mime_type,
          extracted_text: document.extracted_text,
          page_count: document.page_count,
          extracted_at: document.extracted_at,
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Duplicate /api/imports/preview route removed — handled in routes/imports.ts
}
