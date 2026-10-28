import { type NextFunction, type Request, type Response, type Router } from "express";
import multer from "multer";
import { z } from "zod";
import { extname } from "node:path";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import { importService, type ImportPreview } from "../services/import-service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_IMPORT_MB ?? 15) * 1024 * 1024, files: 1 },
});

const confirmSchema = z.object({
  job_id: z.string().uuid(),
  mapping: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))),
});

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

export function mountImportRoutes(router: Router): void {
  router.post(
    "/api/imports/preview",
    requireAuth as unknown as (req: Request, res: Response) => void,
    requireCsrf,
    upload.single("file"),
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to preview imports." },
          });
          return;
        }

        if (!request.file) {
          response.status(400).json({
            error: { code: "NO_FILE", message: "No file was uploaded for preview." },
          });
          return;
        }

        const file = request.file as Express.Multer.File;
        const ext = extname(file.originalname).toLowerCase();
        if (ext !== ".csv") {
          response.status(400).json({
            error: { code: "INVALID_FILE", message: "Only CSV files are supported for preview." },
          });
          return;
        }

        const preview = importService.previewCsv(file.buffer);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "csv_previewed",
          JSON.stringify({
            file_name: file.originalname,
            valid: preview.valid,
            total_rows: preview.totalRows,
          }),
        ]);

        response.json({
          columns: preview.columns,
          rows: preview.rows,
          valid: preview.valid,
          errors: preview.errors,
          total_rows: preview.totalRows,
          valid_rows: preview.validRows,
          invalid_rows: preview.invalidRows,
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  router.post(
    "/api/imports/jobs",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to create import jobs." },
          });
          return;
        }

        const body = z
          .object({
            file_name: z.string().min(1),
            preview: z.object({
              columns: z.array(z.string()),
              rows: z.array(z.array(z.string())),
              valid: z.boolean(),
              errors: z.array(z.string()),
              total_rows: z.number(),
              valid_rows: z.number(),
              invalid_rows: z.array(z.number()),
            }),
          })
          .parse(request.body);

        const preview: ImportPreview = {
          columns: body.preview.columns,
          rows: body.preview.rows,
          valid: body.preview.valid,
          errors: body.preview.errors,
          totalRows: body.preview.total_rows,
          validRows: body.preview.valid_rows,
          invalidRows: body.preview.invalid_rows,
        };

        const job = await importService.createJob(
          user.workspace_id,
          user.id,
          body.file_name,
          preview,
        );

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "import_job_created",
          JSON.stringify({
            job_id: job.id,
            file_name: body.file_name,
            total_rows: body.preview.total_rows,
          }),
        ]);

        response.status(201).json({
          job: {
            id: job.id,
            file_name: job.file_name,
            status: job.status,
            total_rows: job.total_rows,
            created_at: job.created_at,
          },
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

  router.post(
    "/api/imports/validate",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to validate imports." },
          });
          return;
        }

        const body = z
          .object({
            rows: z.array(
              z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
            ),
            mapping: z.record(z.string(), z.string()),
            required_fields: z.array(z.string()).optional(),
          })
          .parse(request.body);

        const validation = importService.validateMappedRows(
          body.rows,
          body.mapping,
          body.required_fields ?? [],
        );

        response.json({
          valid: validation.valid,
          errors: validation.errors,
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

  router.post(
    "/api/imports/confirm",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to confirm imports." },
          });
          return;
        }

        const body = confirmSchema.parse(request.body);

        const job = await importService.getJob(body.job_id);
        if (!job) {
          response
            .status(404)
            .json({ error: { code: "NOT_FOUND", message: "Import job not found." } });
          return;
        }

        if (job.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's import job is not permitted.",
            },
          });
          return;
        }

        const result = await importService.confirmImport(
          body.job_id,
          body.mapping,
          body.rows,
          user.id,
        );

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "import_confirmed",
          JSON.stringify({
            job_id: body.job_id,
            imported_rows: result.importedRows,
            error_rows: result.errorRows,
          }),
        ]);

        response.json({
          job_id: result.jobId,
          imported_rows: result.importedRows,
          error_rows: result.errorRows,
          errors: result.errors,
          status: result.errorRows > 0 && result.importedRows === 0 ? "error" : "completed",
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
          response.status(422).json({
            error: { code: "IMPORT_FAILED", message: error.message },
          });
          return;
        }
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  router.get(
    "/api/imports/jobs",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view imports." },
          });
          return;
        }

        const jobs = await importService.listJobs(user.workspace_id);

        response.json({
          jobs: jobs.map((j) => ({
            id: j.id,
            file_name: j.file_name,
            status: j.status,
            total_rows: j.total_rows,
            imported_rows: j.imported_rows,
            error_rows: j.error_rows,
            created_at: j.created_at,
            completed_at: j.completed_at,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  router.delete(
    "/api/imports/jobs/:id",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to delete imports." },
          });
          return;
        }

        const jobId =
          typeof request.params.id === "string"
            ? request.params.id
            : String(request.params.id?.[0]);
        const job = await importService.getJob(jobId);
        if (!job) {
          response
            .status(404)
            .json({ error: { code: "NOT_FOUND", message: "Import job not found." } });
          return;
        }

        if (job.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's import job is not permitted.",
            },
          });
          return;
        }

        await importService.deleteJob(jobId, user.workspace_id);

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "import_job_deleted",
          JSON.stringify({ job_id: jobId, file_name: job.file_name }),
        ]);

        response.json({ ok: true });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
