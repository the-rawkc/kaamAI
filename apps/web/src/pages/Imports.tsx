import * as React from "react";
import { AlertCircle, ArrowRight, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";
import type { ImportJob } from "@/types";

type WizardStep = "upload" | "preview" | "mapping" | "validate" | "confirm";

export default function Imports() {
  const [step, setStep] = React.useState<WizardStep>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ columns: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [validated, setValidated] = React.useState<{ valid: number; errors: number; errorRows: number[] } | null>(null);
  const [imports, setImports] = React.useState<ImportJob[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getImports();
        if (!cancelled) {
          setImports(response.jobs ?? []);
        }
      } catch {
        setError("Import history is not available right now.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stepOrder: WizardStep[] = ["upload", "preview", "mapping", "validate", "confirm"];
  const stepLabels: Record<WizardStep, string> = {
    upload: "Upload",
    preview: "Preview",
    mapping: "Mapping",
    validate: "Validate",
    confirm: "Confirm",
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported for the import wizard.");
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.previewCsv(file);
      const nextMapping: Record<string, string> = {};
      response.columns.forEach((column) => {
        nextMapping[column] = column;
      });
      setPreview(response);
      setMapping(nextMapping);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV preview failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = () => {
    if (!preview) return;

    const invalidRows: number[] = [];
    let validRows = 0;
    let invalidCount = 0;

    preview.rows.forEach((row, index) => {
      const hasBlank = row.some((cell) => cell.trim() === "");
      if (hasBlank) {
        invalidRows.push(index);
        invalidCount += 1;
      } else {
        validRows += 1;
      }
    });

    setValidated({ valid: validRows, errors: invalidCount, errorRows: invalidRows });
    setStep("validate");
  };

  const handleConfirm = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      await api.confirmImport(`demo_job_${Date.now()}`, {}, []);
      setSuccess("Import confirmed and queued for processing.");
      setStep("upload");
      setFile(null);
      setPreview(null);
      setMapping({});
      setValidated(null);
      const response = await api.getImports();
      setImports(response.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The import could not be confirmed.");
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">Data imports</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Import and validate CSV data</h1>
        </div>

        <Button type="button" variant="outline" onClick={() => setStep("upload")} className="rounded-xl">
          Start new import
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
          <span>{success}</span>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-5">
          {stepOrder.map((item, index) => (
            <div key={item} className="relative flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                  index < currentIndex
                    ? "bg-[#6D5EF7] text-white"
                    : index === currentIndex
                      ? "border border-[#6D5EF7] bg-violet-50 text-[#6D5EF7]"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {index + 1}
              </div>
              <div className="text-xs font-medium text-slate-500">{stepLabels[item]}</div>
            </div>
          ))}
        </div>
      </div>

      {step === "upload" ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#172033]">Upload a CSV file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Upload className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  readOnly
                  value={file?.name ?? ""}
                  placeholder="Choose a CSV file…"
                  className="border-slate-200 bg-slate-50 pl-9"
                />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D5EF7] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#584ae5]">
                <FileUp className="h-4 w-4" />
                Select file
                <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>

            <Button type="button" onClick={() => void handlePreview()} disabled={!file || loading} className="rounded-xl">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Preview data
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "preview" && preview ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg text-[#172033]">Preview data</CardTitle>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              {preview.rows.length} rows
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    {preview.columns.map((column) => (
                      <th key={column} className="border-b border-slate-200 pb-3 pr-4 font-medium text-slate-500">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={`${row.join('-')}-${rowIndex}`} className="border-b border-slate-100">
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`} className="py-2 pr-4 text-slate-600">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("mapping")} className="rounded-xl">
                Map columns
              </Button>
              <Button type="button" onClick={handleValidate} className="rounded-xl">
                Validate rows
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "mapping" && preview ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#172033]">Map CSV columns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {preview.columns.map((column) => (
              <div key={column} className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
                <label className="text-sm font-medium text-slate-600">{column}</label>
                <select
                  value={mapping[column] ?? column}
                  onChange={(event) =>
                    setMapping((previous) => ({
                      ...previous,
                      [column]: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0 focus:border-[#6D5EF7]"
                >
                  {preview.columns.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <Button type="button" onClick={handleValidate} className="rounded-xl">
              Continue to validation
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "validate" && validated ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#172033]">Validation results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Valid rows</div>
                <div className="mt-2 text-2xl font-semibold text-[#172033]">{validated.valid}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Rows with errors</div>
                <div className="mt-2 text-2xl font-semibold text-[#172033]">{validated.errors}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Coverage</div>
                <div className="mt-2 text-2xl font-semibold text-[#172033]">
                  {preview ? `${Math.round((validated.valid / preview.rows.length) * 100)}%` : "0%"}
                </div>
              </div>
            </div>

            <Button type="button" onClick={() => setStep("confirm")} className="rounded-xl">
              Confirm import
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "confirm" ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-[#172033]">Confirm import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              You are about to import <span className="font-semibold text-[#172033]">{file?.name ?? "this file"}</span> into KaamAI. This action will create a reusable business data source for RAG and reporting.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => void handleConfirm()} disabled={loading} className="rounded-xl">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm import
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("validate")} className="rounded-xl">
                Back to validation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">Import history</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-3 font-medium">File</th>
                  <th className="pb-3 font-medium">Rows</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {imports.length > 0 ? (
                  imports.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 align-middle">
                      <td className="py-3 pr-4 text-[#172033]">{item.fileName}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.importedRows} / {item.totalRows}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "success"
                              : item.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-2 py-8 text-center text-slate-500">
                      No CSV imports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
