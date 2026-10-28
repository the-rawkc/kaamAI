import { query } from "../db/connection.js";

export interface BusinessRecord {
  id: string;
  workspace_id: string;
  import_job_id: string;
  record_data: Record<string, unknown>;
  source_row: number;
  created_at: Date;
}

export interface SalesTotalResult {
  totalSales: number;
  transactionCount: number;
  averageSale: number;
  currency?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  dateField?: string;
}

export interface TopProduct {
  product: string;
  totalSales: number;
  transactionCount: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber?: string;
  customer?: string;
  amount: number;
  date?: string;
  dueDate?: string;
  status?: string;
}

export interface OverdueResult {
  overdueCount: number;
  overdueTotal: number;
  overdueInvoices: InvoiceItem[];
}

/**
 * Deterministic business tools for imported CSV records.
 *
 * All calculations are read-only, deterministic, and workspace-scoped.
 * No external side effects. Invalid arguments are rejected before execution.
 */
export class BusinessToolsService {
  private async getWorkspaceRecords(workspaceId: string): Promise<BusinessRecord[]> {
    const result = await query(
      `SELECT id, workspace_id, import_job_id, record_data, source_row, created_at
       FROM business_records
       WHERE workspace_id = $1
       ORDER BY created_at ASC`,
      [workspaceId],
    );
    return (result as { rows: BusinessRecord[] }).rows;
  }

  private extractNumber(record: Record<string, unknown>, field: string): number | null {
    const value = record[field];
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[$,]/g, "").trim();
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private extractString(record: Record<string, unknown>, field: string): string | undefined {
    const value = record[field];
    if (value === undefined || value === null || value === "") return undefined;
    return String(value);
  }

  private extractDate(record: Record<string, unknown>, field: string): string | undefined {
    return this.extractString(record, field);
  }

  private parseDate(dateStr: string | undefined): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private filterByDateRange(records: BusinessRecord[], filter: DateRangeFilter): BusinessRecord[] {
    if (!filter.startDate && !filter.endDate) return records;
    const start = filter.startDate ? this.parseDate(filter.startDate) : null;
    const end = filter.endDate ? this.parseDate(filter.endDate) : null;
    const dateField = filter.dateField ?? "date";
    return records.filter((record) => {
      const dateStr = this.extractDate(record.record_data, dateField);
      const recordDate = this.parseDate(dateStr);
      if (!recordDate) return false;
      if (start && recordDate < start) return false;
      if (end && recordDate > end) return false;
      return true;
    });
  }

  /**
   * Tool: sales_totals
   * Sum amounts across records with optional date range.
   */
  async salesTotals(
    workspaceId: string,
    options: { amountField?: string; dateRange?: DateRangeFilter } = {},
  ): Promise<SalesTotalResult> {
    const { amountField = "amount", dateRange } = options;
    const records = await this.getWorkspaceRecords(workspaceId);
    const filtered = this.filterByDateRange(records, dateRange ?? {});

    let totalSales = 0;
    let transactionCount = 0;
    let currency: string | undefined;

    for (const record of filtered) {
      const amount = this.extractNumber(record.record_data, amountField);
      if (amount !== null) {
        totalSales += amount;
        transactionCount++;
      }
      const cur = this.extractString(record.record_data, "currency");
      if (cur && !currency) currency = cur;
    }

    const averageSale = transactionCount > 0 ? totalSales / transactionCount : 0;

    return {
      totalSales: Math.round(totalSales * 100) / 100,
      transactionCount,
      averageSale: Math.round(averageSale * 100) / 100,
      currency,
    };
  }

  /**
   * Tool: top_products
   * Rank products by total sales volume with optional date range.
   */
  async topProducts(
    workspaceId: string,
    options: {
      productField?: string;
      amountField?: string;
      dateRange?: DateRangeFilter;
      limit?: number;
    } = {},
  ): Promise<TopProduct[]> {
    const { productField = "product", amountField = "amount", dateRange, limit = 10 } = options;

    const records = await this.getWorkspaceRecords(workspaceId);
    const filtered = this.filterByDateRange(records, dateRange ?? {});

    const productMap = new Map<string, { totalSales: number; count: number }>();

    for (const record of filtered) {
      const product = this.extractString(record.record_data, productField);
      const amount = this.extractNumber(record.record_data, amountField);
      if (!product || amount === null) continue;

      const existing = productMap.get(product) ?? { totalSales: 0, count: 0 };
      existing.totalSales += amount;
      existing.count += 1;
      productMap.set(product, existing);
    }

    return Array.from(productMap.entries())
      .map(([product, data]) => ({
        product,
        totalSales: Math.round(data.totalSales * 100) / 100,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  /**
   * Tool: invoice_list
   * List invoices with optional status filter and date range.
   */
  async invoiceList(
    workspaceId: string,
    options: {
      invoiceField?: string;
      customerField?: string;
      amountField?: string;
      dateField?: string;
      statusField?: string;
      dueDateField?: string;
      statusFilter?: string;
      dateRange?: DateRangeFilter;
    } = {},
  ): Promise<InvoiceItem[]> {
    const {
      invoiceField = "invoice_number",
      customerField = "customer",
      amountField = "amount",
      dateField = "date",
      statusField = "status",
      dueDateField = "due_date",
      statusFilter,
      dateRange = { dateField },
    } = options;

    const records = await this.getWorkspaceRecords(workspaceId);
    const filtered = this.filterByDateRange(records, dateRange);

    const invoices: InvoiceItem[] = [];

    for (const record of filtered) {
      const status = this.extractString(record.record_data, statusField);
      if (statusFilter && status !== statusFilter) continue;
      const amount = this.extractNumber(record.record_data, amountField) ?? 0;
      invoices.push({
        id: record.id,
        invoiceNumber: this.extractString(record.record_data, invoiceField),
        customer: this.extractString(record.record_data, customerField),
        amount,
        date: this.extractDate(record.record_data, dateField),
        dueDate: this.extractDate(record.record_data, dueDateField),
        status,
      });
    }

    invoices.sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });

    return invoices;
  }

  /**
   * Tool: overdue_totals
   * Calculate overdue invoice amounts: invoices with a due date in the past
   * and status not already paid/closed.
   */
  async overdueTotals(
    workspaceId: string,
    options: {
      amountField?: string;
      dueDateField?: string;
      statusField?: string;
      asOfDate?: string;
    } = {},
  ): Promise<OverdueResult> {
    const {
      amountField = "amount",
      dueDateField = "due_date",
      statusField = "status",
      asOfDate,
    } = options;

    const records = await this.getWorkspaceRecords(workspaceId);
    const referenceDate = asOfDate ? this.parseDate(asOfDate) : new Date();
    if (!referenceDate) {
      throw new Error(`Invalid as_of_date: ${asOfDate ?? "undefined"}`);
    }

    const paidStatuses = new Set(["paid", "closed", "settled", "complete"]);
    const overdueInvoices: InvoiceItem[] = [];
    let overdueTotal = 0;

    for (const record of records) {
      const dueDateStr = this.extractDate(record.record_data, dueDateField);
      const dueDate = this.parseDate(dueDateStr);
      if (!dueDate) continue;

      const status = this.extractString(record.record_data, statusField) ?? "";
      if (paidStatuses.has(status.toLowerCase())) continue;

      if (dueDate < referenceDate) {
        const amount = this.extractNumber(record.record_data, amountField) ?? 0;
        overdueTotal += amount;
        overdueInvoices.push({
          id: record.id,
          invoiceNumber: this.extractString(record.record_data, "invoice_number"),
          customer: this.extractString(record.record_data, "customer"),
          amount,
          date: this.extractDate(record.record_data, "date"),
          dueDate: dueDateStr,
          status,
        });
      }
    }

    overdueInvoices.sort((a, b) => {
      const ad = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bd = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return ad - bd;
    });

    return {
      overdueCount: overdueInvoices.length,
      overdueTotal: Math.round(overdueTotal * 100) / 100,
      overdueInvoices,
    };
  }
}

export const businessToolsService = new BusinessToolsService();
