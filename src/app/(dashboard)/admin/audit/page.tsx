import React from "react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, UserCheck, Activity } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria & Conformidade"
        subtitle="Registro imutável de ações administrativas, acessos e sorteios realizados"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-4">Data e Hora</th>
                <th className="py-3 px-4">Usuário</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">IP / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Nenhum log registrado ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {log.user ? log.user.name : "Sistema / Público"}
                      {log.user && <div className="text-[10px] text-slate-400 font-normal">{log.user.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="navy">{log.action}</Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                      {log.metadata ? JSON.stringify(log.metadata) : log.ipAddress || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
