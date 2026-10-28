import { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth.js";
import { query } from "../db/connection.js";
import { businessToolsService } from "../services/business-tools.js";

const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  dateField: z.string().optional(),
});

const toolIdSchema = z.object({
  tool: z.enum(["sales_totals", "top_products", "invoice_list", "overdue_totals"]),
});

const salesTotalsSchema = toolIdSchema.extend({
  amountField: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
});

const topProductsSchema = toolIdSchema.extend({
  productField: z.string().optional(),
  amountField: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
  limit: z.number().min(1).max(100).optional(),
});

const invoiceListSchema = toolIdSchema.extend({
  invoiceField: z.string().optional(),
  customerField: z.string().optional(),
  amountField: z.string().optional(),
  dateField: z.string().optional(),
  statusField: z.string().optional(),
  dueDateField: z.string().optional(),
  statusFilter: z.string().optional(),
  dateRange: dateRangeSchema.optional(),
});

const overdueTotalsSchema = toolIdSchema.extend({
  amountField: z.string().optional(),
  dueDateField: z.string().optional(),
  statusField: z.string().optional(),
  asOfDate: z.string().datetime().optional(),
});

export function mountToolsRoutes(router: Router): void {
  router.get(
    "/api/tools",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (_request: Request, response: Response) => {
      response.json({
        tools: [
          {
            name: "sales_totals",
            description: "Calculate total sales, transaction count, and average sale.",
            parameters: [
              "amountField",
              "dateRange.startDate",
              "dateRange.endDate",
              "dateRange.dateField",
            ],
          },
          {
            name: "top_products",
            description: "Rank products by total sales volume.",
            parameters: [
              "productField",
              "amountField",
              "dateRange.startDate",
              "dateRange.endDate",
              "dateRange.dateField",
              "limit",
            ],
          },
          {
            name: "invoice_list",
            description: "List invoices with optional status and date filters.",
            parameters: [
              "invoiceField",
              "customerField",
              "amountField",
              "dateField",
              "statusField",
              "dueDateField",
              "statusFilter",
              "dateRange.startDate",
              "dateRange.endDate",
              "dateRange.dateField",
            ],
          },
          {
            name: "overdue_totals",
            description: "Calculate overdue invoice amounts and count.",
            parameters: ["amountField", "dueDateField", "statusField", "asOfDate"],
          },
        ],
      });
    },
  );

  router.post(
    "/api/tools/run",
    requireAuth as unknown as (req: Request, res: Response) => void,
    async (request: AuthenticatedRequest, response: Response) => {
      try {
        const user = request.user;
        if (!user) {
          response.status(401).json({
            error: { code: "UNAUTHENTICATED", message: "Sign in to run business tools." },
          });
          return;
        }

        const body = toolIdSchema.parse(request.body);

        let result: unknown;
        switch (body.tool) {
          case "sales_totals": {
            const parsed = salesTotalsSchema.parse(request.body);
            result = await businessToolsService.salesTotals(user.workspace_id, {
              amountField: parsed.amountField,
              dateRange: parsed.dateRange,
            });
            break;
          }
          case "top_products": {
            const parsed = topProductsSchema.parse(request.body);
            result = await businessToolsService.topProducts(user.workspace_id, {
              productField: parsed.productField,
              amountField: parsed.amountField,
              dateRange: parsed.dateRange,
              limit: parsed.limit,
            });
            break;
          }
          case "invoice_list": {
            const parsed = invoiceListSchema.parse(request.body);
            result = await businessToolsService.invoiceList(user.workspace_id, {
              invoiceField: parsed.invoiceField,
              customerField: parsed.customerField,
              amountField: parsed.amountField,
              dateField: parsed.dateField,
              statusField: parsed.statusField,
              dueDateField: parsed.dueDateField,
              statusFilter: parsed.statusFilter,
              dateRange: parsed.dateRange,
            });
            break;
          }
          case "overdue_totals": {
            const parsed = overdueTotalsSchema.parse(request.body);
            result = await businessToolsService.overdueTotals(user.workspace_id, {
              amountField: parsed.amountField,
              dueDateField: parsed.dueDateField,
              statusField: parsed.statusField,
              asOfDate: parsed.asOfDate,
            });
            break;
          }
        }

        await query(`INSERT INTO audit_logs (user_id, action, metadata) VALUES ($1, $2, $3)`, [
          user.id,
          "business_tool_run",
          JSON.stringify({ tool: body.tool, workspace_id: user.workspace_id }),
        ]);

        response.json({
          tool: body.tool,
          workspace_id: user.workspace_id,
          result,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          response.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: error.issues[0]?.message ?? "Invalid tool arguments.",
            },
          });
          return;
        }
        if (error instanceof Error) {
          response.status(422).json({
            error: { code: "TOOL_ERROR", message: error.message },
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
