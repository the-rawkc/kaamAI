import * as React from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Database,
  Loader2,
  Lock,
  Mail,
  Shield,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading, login, register } = useAuth();

  const [mode, setMode] = React.useState<"login" | "register">(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // If already authenticated, redirect straight to dashboard
  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim() || undefined);
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Top minimal header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6D5EF7] to-violet-400 text-white shadow-md shadow-violet-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#172033]">KaamAI</span>
              <span className="ml-2 rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-[#6D5EF7]">
                v2.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Shield className="h-3.5 w-3.5 text-emerald-600" /> Enterprise Dual AI
            </span>
          </div>
        </div>
      </header>

      {/* Main split auth container */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#172033]">
              {mode === "login" ? "Sign in to KaamAI" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {mode === "login"
                ? "Access your documents, AI assistant, and business tools."
                : "Enter your name, email, and password to launch your workspace."}
            </p>
          </div>

          {/* Card with Mode Switch Tabs */}
          <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            <div className="flex border-b border-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  mode === "login"
                    ? "bg-violet-50 text-[#6D5EF7] shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                  mode === "register"
                    ? "bg-violet-50 text-[#6D5EF7] shadow-sm font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>

            <CardContent className="pt-6">
              {error ? (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span className="leading-snug">{error}</span>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                      Full Name
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pl-10"
                    />
                  </div>
                  {mode === "register" && (
                    <p className="text-[11px] text-slate-500">Minimum 8 characters.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full h-11 bg-[#6D5EF7] hover:bg-violet-700 font-medium text-white shadow-md shadow-violet-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === "login" ? "Signing in…" : "Creating workspace…"}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Register & Start"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                {mode === "login" ? (
                  <p className="text-xs text-slate-600">
                    New to KaamAI?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("register");
                        setError(null);
                      }}
                      className="font-semibold text-[#6D5EF7] hover:underline"
                    >
                      Create an account
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                      }}
                      className="font-semibold text-[#6D5EF7] hover:underline"
                    >
                      Sign in instead
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick value props pill list */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs text-slate-500">
            <div className="rounded-xl border border-slate-200/60 bg-white/60 p-2.5">
              <Database className="mx-auto mb-1 h-4 w-4 text-[#6D5EF7]" />
              <span>Grounded RAG</span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/60 p-2.5">
              <Sparkles className="mx-auto mb-1 h-4 w-4 text-emerald-600" />
              <span>Zero-Math Errors</span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-white/60 p-2.5">
              <Shield className="mx-auto mb-1 h-4 w-4 text-violet-600" />
              <span>Audit Approvals</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white py-4 text-center text-xs text-slate-500">
        KaamAI &copy; {new Date().getFullYear()} — Autonomous Business Operations Platform
      </footer>
    </div>
  );
}
