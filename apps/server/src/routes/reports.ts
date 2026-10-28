import { type Request, type Response, type Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { findReportById, findReportsByWorkspace } from "../models/report.js";

export function mountReportsRoutes(router: Router): void {
  // List generated reports for the current workspace.
  // Reports are derived from audit_logs entries that record report generation.
  router.get(
    "/api/reports",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to view reports." },
          });
          return;
        }

        const reports = await findReportsByWorkspace(user.workspace_id);

        response.json({
          reports: reports.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            generatedAt: r.generated_at.toISOString(),
            downloadUrl: `/api/reports/${r.id}/download`,
            status: r.status,
          })),
        });
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );

  // Download a generated report (placeholder: returns a simple PDF-like response).
  router.get(
    "/api/reports/:id/download",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to download reports." },
          });
          return;
        }

        const reportId =
          typeof request.params.id === "string"
            ? request.params.id
            : String(request.params.id?.[0]);

        const report = await findReportById(reportId);
        if (!report) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Report not found." },
          });
          return;
        }

        if (report.workspace_id !== user.workspace_id) {
          response.status(403).json({
            error: {
              code: "FORBIDDEN",
              message: "Access to another workspace's report is not permitted.",
            },
          });
          return;
        }

        if (report.status !== "ready") {
          response.status(400).json({
            error: { code: "REPORT_NOT_READY", message: "Report is not ready for download." },
          });
          return;
        }

        const title = report.title;

        // Generate a minimal PDF placeholder so the download path works end-to-end.
        const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 50 700 Td (KaamAI Report: ${title}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n291\n%%EOF`;

        response.setHeader("Content-Type", "application/pdf");
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="kaamai-report-${reportId}.pdf"`,
        );
        response.send(pdfContent);
      } catch {
        response.status(500).json({
          error: { code: "INTERNAL_ERROR", message: "The server could not complete this request." },
        });
      }
    },
  );
}
