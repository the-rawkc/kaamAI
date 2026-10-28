import * as React from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

interface AppShellProps {
  children: React.ReactNode;
  currentPath: string;
}

export function AppShell({ children, currentPath }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033]">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activePath={currentPath}
        />

        <div className="flex flex-1 flex-col min-w-0">
          <TopNav
            currentPath={currentPath}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />

          <main className="flex-1 overflow-y-auto px-4 pb-8 pt-20 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
