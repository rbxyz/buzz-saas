// app/dashboard/layout.tsx
import type React from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="bg-background text-foreground flex min-h-screen w-full flex-col">
        <DashboardHeader />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Sidebar fixo com largura 64 (256px) */}
          <DashboardSidebar />

          {/* Área principal, com padding para "não ficar atrás do sidebar" */}
          <main className="flex-1 overflow-y-auto p-6 md:pl-64">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
