import React from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50 text-slate-900">
      {/* Sidebar - Fixa lateralmente */}
      <AdminSidebar />

      {/* Main Content Area - Header fixo no topo e conteúdo rolável */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl w-full mx-auto pb-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
