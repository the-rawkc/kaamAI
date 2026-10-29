import * as React from "react";
import { AlertCircle, CheckCircle2, Cloud, Lock, Loader2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { api } from "@/services/api";

export default function SettingsPage() {
  const [providers, setProviders] = React.useState<Array<{ name: string; status: string; configured: boolean }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await api.getProviderHealth();
        if (!cancelled) {
          setProviders(response.providers ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("Provider health data is unavailable right now.");
        }
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

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D5EF7]" />
          <p>Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-[#6D5EF7]">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#172033]">Workspace controls</h1>
        </div>

        <Button variant="outline" className="rounded-xl" disabled>
          <Settings className="mr-2 h-4 w-4" />
          Workspace settings
          <span className="ml-2 text-xs text-slate-400">coming later</span>
        </Button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">AI provider health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <div key={provider.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 text-[#6D5EF7] shadow-sm">
                    <Cloud className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#172033]">{provider.name}</div>
                    <div className="text-xs text-slate-500">{provider.configured ? "Configured" : "Not configured"}</div>
                  </div>
                </div>

                <Badge variant={provider.status === "healthy" ? "success" : provider.status === "unknown" ? "secondary" : "destructive"}>
                  {provider.status}
                </Badge>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No provider information available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">Security & privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-medium text-[#172033]">Local AI processing</div>
              <div className="mt-1 text-xs text-slate-500">
                KaamAI defaults to Ollama to keep business documents and prompts local unless a user explicitly configures a hosted provider.
              </div>
            </div>
            <Badge variant="success">Local</Badge>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-medium text-[#172033]">Data storage</div>
              <div className="mt-1 text-xs text-slate-500">
                Documents and generated indexes remain within your workspace and are removed when deleted.
              </div>
            </div>
            <Lock className="mt-1 h-4 w-4 text-slate-500" />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-medium text-[#172033]">Dual AI Backend</div>
              <div className="mt-1 text-xs text-slate-500">
                Connected to live FastAPI backend with local Ollama inference and Google Gemini cloud API.
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#172033]">Quick status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-0">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Auth layer ready
          </div>
          <div className="flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-sm text-[#6D5EF7]">
            <Cloud className="h-4 w-4" />
            Local provider default
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
