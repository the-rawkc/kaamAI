import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  CheckCheck,
  ChevronRight,
  FileText,
  FileUp,
  LayoutDashboard,
  LogOut,
  Settings,
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
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/assistant", icon: Bot },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Data Imports", href: "/imports", icon: FileUp },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Approvals", href: "/approvals", icon: CheckCheck },
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
    navigate("/login", { replace: true });
  };

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6D5EF7] text-sm font-bold text-white">
              K
            </div>
            <div>
              <div className="text-base font-semibold">KaamAI</div>
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
              Workspace
            </p>

            <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-2 py-2">
              <Avatar fallback={user?.name?.[0] ?? "JD"} className="h-9 w-9 bg-slate-800 text-xs text-slate-100" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">{user?.name ?? "User"}</div>
                <div className="truncate text-xs text-slate-400">{user?.email ?? ""}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
