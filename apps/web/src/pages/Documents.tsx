import * as React from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Search, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/services/api";
import { formatBytes, formatRelativeDate } from "@/lib/utils";
import type { Document } from "@/types";

export default function Documents() {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [filter, setFilter] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [extracting, setExtracting] = React.useState<Record<string, boolean>>({});
  const [extractedContent, setExtractedContent] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getDocuments();
        if (!cancelled) {
          setDocuments(response.documents ?? []);
        }
      } catch {
        setError("Unable to load your document library right now.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDocuments = documents.filter((document) => {
    const matchesText = document.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = status === "all" || document.status === status;
    return matchesText && matchesStatus;
  });

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.uploadDocument(file);
      setSuccess(`"${file.name}" was uploaded and queued for indexing.`);
      setFile(null);
      event.currentTarget.reset();
      const response = await api.getDocuments();
      setDocuments(response.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload could not be completed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;

    try {
      await api.deleteDocument(id);
      setDocuments((previous) => previous.filter((item) => item.id !== id));
      setSuccess("The document was removed from the workspace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete the document.");
    }
  };

  const handleReindex = async (id: string) => {
    try {
      await api.reindexDocument(id);
      setSuccess("Re-indexing started for the selected document.");
      const response = await api.getDocuments();
      setDocuments(response.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-indexing could not start.");
    }
  };

  const handleExtract = async (id: string) => {
    setExtracting((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const response = await api.extractDocument(id);
      setSuccess(`Text extraction complete: ${response.text_length ?? 0} characters, ${response.page_count ?? 0} page(s).`);
      const refreshed = await api.getDocuments();
      setDocuments(refreshed.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text extraction failed.");
    } finally {
      setExtracting((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleViewContent = async (id: string) => {
    try {
      const content = await api.getDocumentContent(id);
      setExtractedContent((prev) => ({ ...prev, [id]: content.extracted_text ?? "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load document content.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading documents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">Documents</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Your document library</h1>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#6D5EF7] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#584ae5]">
          <Upload className="h-4 w-4" />
          Upload document
          <input
            type="file"
            className="hidden"
            accept=".pdf,.txt,.csv,.png,.jpg,.jpeg"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setError(null);
              setSuccess(null);
            }}
          />
        </label>
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

      <form onSubmit={handleUpload} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              readOnly
              value={file?.name ?? ""}
              placeholder="Select a file to upload…"
              className="border-slate-200 bg-slate-50 pl-9"
            />
          </div>
          {file ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">
                {file.name} • {formatBytes(file.size)}
              </span>
              <Button type="submit" disabled={uploading} className="rounded-xl">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setFile(null)}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>
      </form>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-lg text-[#172033]">Library</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Search documents…"
                className="border-slate-200 bg-slate-50 pl-9"
              />
            </div>
            {['all', 'indexed', 'processing', 'error'].map((statusOption) => (
              <Button
                key={statusOption}
                type="button"
                variant={status === statusOption ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setStatus(statusOption)}
              >
                {statusOption === "all" ? "All" : statusOption}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-3 font-medium">Document</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Size</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Uploaded</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map((document) => (
                    <tr key={document.id} className="border-t border-slate-200 align-middle">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-violet-50 p-2 text-[#6D5EF7]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#172033]">{document.name}</div>
                            <div className="text-xs text-slate-500">{document.sourceUrl ? "Indexed for RAG" : "No source reference"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{document.type}</td>
                      <td className="py-3 pr-4 text-slate-600">{formatBytes(document.size)}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            document.status === "indexed"
                              ? "success"
                              : document.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                          className="capitalize"
                        >
                          {document.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{formatRelativeDate(document.uploadedAt)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {document.status === "indexed" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleViewContent(document.id)}
                            >
                              View Content
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={extracting[document.id]}
                              onClick={() => void handleExtract(document.id)}
                            >
                              {extracting[document.id] ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}Extract
                            </Button>
                          )}
                          <Button type="button" variant="outline" size="sm" onClick={() => void handleReindex(document.id)}>
                            Re-index
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => void handleDelete(document.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-2 py-12 text-center text-slate-500">
                      No documents match your current search or status filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {Object.keys(extractedContent).length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-[#172033]">Extracted Content</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setExtractedContent({})}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-auto max-h-[400px] text-sm text-slate-600 whitespace-pre-wrap break-words p-4 border border-slate-200 rounded-xl bg-slate-50">
              {Object.values(extractedContent)[0]}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
