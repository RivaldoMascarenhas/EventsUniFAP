import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "gold" | "outline" | "navy" | "primary";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    primary: "bg-unifap-navy text-white border-unifap-blue font-semibold",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold",
    warning: "bg-amber-50 text-amber-800 border-amber-200 font-semibold",
    danger: "bg-rose-50 text-rose-700 border-rose-200 font-semibold",
    gold: "bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold",
    navy: "bg-unifap-navy text-white border-unifap-blue font-semibold",
    outline: "bg-transparent text-slate-600 border-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
    case "AVAILABLE":
      return <Badge variant="success">● Ativo</Badge>;
    case "SCHEDULED":
      return <Badge variant="warning">● Agendado</Badge>;
    case "FINISHED":
    case "DRAWN":
      return <Badge variant="navy">✔ Sorteado / Finalizado</Badge>;
    case "DRAFT":
      return <Badge variant="outline">Rascunho</Badge>;
    case "CANCELLED":
    case "ARCHIVED":
      return <Badge variant="danger">Cancelado</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
