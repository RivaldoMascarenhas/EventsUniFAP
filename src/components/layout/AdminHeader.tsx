"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { Shield, Sparkles, Tv } from "lucide-react";
import Link from "next/link";

export function AdminHeader() {
  const { data: session } = useSession();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Centro Universitário Paraíso — UniFAP
        </span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-emerald-600">Sistema Conectado</span>
      </div>

      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <Shield className="w-3.5 h-3.5 text-unifap-navy" />
            <span>Perfil: {session.user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
}
