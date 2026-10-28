import * as React from "react";
import { Bell, CircleHelp, Menu, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";

interface TopNavProps {
  currentPath: string;
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/assistant": "AI Assistant",
  "/documents": "Documents",
  "/imports": "Data Imports",
  "/reports": "Reports",
  "/approvals": "Approvals",
  "/settings": "Settings",
};

export function TopNav({ currentPath, onMenuToggle }: TopNavProps) {
  const [query, setQuery] = React.useState("");
  const title = PAGE_TITLES[currentPath] ?? "Overview";

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-[#6D5EF7]">
              KaamAI
            </div>
            <span className="text-sm text-slate-500">Workspace</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workspace…"
              className="border-slate-200 bg-slate-50 pl-9"
              aria-label="Search workspace"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 md:flex">
            <span className="font-medium text-slate-700">{title}</span>
          </div>

          <button
            type="button"
            aria-label="Help center"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <CircleHelp className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#6D5EF7]" />
          </button>

          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
            <Avatar
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
              alt="Jane Doe"
              fallback="JD"
              className="h-8 w-8"
            />
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold text-slate-800">Jane</div>
              <div className="text-[10px] text-slate-500">Owner</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
