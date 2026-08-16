"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Gift,
  Building2,
  Trophy,
  History,
  ShieldCheck,
  Users,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

import { BrandLogo } from "@/components/branding/BrandLogo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Eventos", href: "/admin/events", icon: CalendarDays },
  { label: "Patrocinadores", href: "/admin/sponsors", icon: Building2 },
  { label: "Resultados & Histórico", href: "/admin/results", icon: History },
  { label: "Usuários & Equipe", href: "/admin/users", icon: Users, adminOnly: true },
  { label: "Trilha de Auditoria", href: "/admin/audit", icon: ShieldCheck, adminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-64 bg-unifap-navy text-white flex flex-col shrink-0 min-h-screen border-r border-unifap-blue/40 select-none shadow-xl z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex flex-col gap-2">
        <Link href="/admin/dashboard" className="flex flex-col gap-2 group transition opacity-95 hover:opacity-100">
          <div className="flex items-center justify-between gap-2">
            <BrandLogo variant="white" width={170} height={42} priority className="h-7 w-auto" />
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-unifap-gold text-slate-950 shadow-sm">
              Sorteios
            </span>
          </div>
          <div className="text-[11px] text-blue-200/80 font-medium tracking-wide text-center">
            Painel Institucional de Gestão
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold text-blue-300/60 px-3 mb-2 tracking-wider">
          Menu Principal
        </div>
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-unifap-gold text-unifap-dark font-bold shadow-md shadow-amber-500/20"
                  : "text-blue-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive ? "text-unifap-dark" : "text-blue-300"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session & Logout */}
      <div className="p-4 border-t border-unifap-blue/40 bg-unifap-dark/50">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-unifap-gold/20 border border-unifap-gold/50 flex items-center justify-center text-unifap-gold text-xs font-bold shrink-0">
            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{session?.user?.name || "Usuário UniFAP"}</p>
            <p className="text-[10px] text-amber-400 font-semibold uppercase">{session?.user?.role || "OPERATOR"}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 border border-rose-900/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className={cn("w-3.5 h-3.5", isLoggingOut && "animate-spin")} />
          <span>{isLoggingOut ? "Encerrando..." : "Encerrar Sessão"}</span>
        </button>
      </div>
    </aside>
  );
}
