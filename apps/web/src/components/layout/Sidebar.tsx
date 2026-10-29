import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Bot,
  CheckCheck,
  ChevronRight,
  FileText,
  FileUp,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/assistant", icon: Bot },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Data Imports", href: "/imports", icon: FileUp },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Approvals", href: "/approvals", icon: CheckCheck },
  { label: "User Guide", href: "/docs", icon: BookOpen },
  { label: "Admin Portal", href: "/admin", icon: Shield },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePath: string;
}

export function Sidebar({ isOpen, onClose, activePath }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#111827] text-white transition-transform duration-200 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6D5EF7] to-violet-400 text-sm font-bold text-white shadow-md shadow-violet-900/30">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white">KaamAI</div>
              <div className="text-[10px] text-slate-400">Enterprise Co-Pilot</div>
            </div>
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.href;

              return (
                <button
                  key={item.label}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    navigate(item.href);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#6D5EF7] text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="default" className="bg-white/10 text-[10px] text-white">
                      {item.badge}
                    </Badge>
                  ) : null}
                  <ChevronRight className="h-4 w-4 opacity-60" aria-hidden="true" />
                </button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-800 pt-4">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Workspace Profile
            </p>

            <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-2.5 py-2.5 border border-slate-800/60">
              <Avatar fallback={initials} className="h-9 w-9 bg-violet-900/60 text-xs font-semibold text-violet-200 border border-violet-700/50" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{displayName}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="truncate text-[11px] text-slate-400">{user?.email ?? ""}</span>
                  {user?.role && (
                    <span className="rounded bg-violet-950 px-1.5 py-0.2 text-[9px] font-semibold uppercase text-violet-300 border border-violet-800/40">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-red-950/40 hover:text-red-300"
          >
            <LogOut className="h-4 w-4 text-red-400" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
