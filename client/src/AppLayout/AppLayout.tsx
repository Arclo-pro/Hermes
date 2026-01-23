import React from "react";
import { Sidebar } from "@/components/Sidebar";

type AppLayoutProps = {
  children: React.ReactNode;
  pageTitle?: string;
  rightSlot?: React.ReactNode;
};

export function AppLayout({ children, pageTitle, rightSlot }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-soft text-text-primary">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-surface-border bg-surface-primary/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div className="min-w-0">
                {pageTitle ? (
                  <h1 className="truncate text-lg font-semibold text-text-primary">
                    {pageTitle}
                  </h1>
                ) : (
                  <span className="text-sm text-text-secondary">Arclo</span>
                )}
              </div>
              <div className="flex items-center gap-3">{rightSlot}</div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
