import React from "react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FileSpreadsheet, Download, Trophy, History, Building2 } from "lucide-react";
import { formatDateTime, maskCPF, padNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResultsHistoryPage() {
  const draws = await prisma.draw.findMany({
    include: {
      event: { select: { id: true, name: true, slug: true } },
      prize: {
        include: { sponsor: true },
      },
      winnerParticipant: true,
      operator: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico Geral de Sorteios"
        subtitle="Registro oficial de todos os sorteios e contemplados nos eventos da UniFAP"
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <th className="py-3.5 px-4 text-center">Nº Bilhete</th>
                <th className="py-3.5 px-4">Ganhador</th>
                <th className="py-3.5 px-4">Evento</th>
                <th className="py-3.5 px-4">Prêmio Conquistado</th>
                <th className="py-3.5 px-4">Patrocinador</th>
                <th className="py-3.5 px-4 text-right">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {draws.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum sorteio registrado ainda no sistema.
                  </td>
                </tr>
              ) : (
                draws.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-center font-black font-mono text-unifap-navy text-sm">
                      #{padNumber(d.drawnNumber || d.winnerParticipant.ticketNumber, 3)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {d.winnerParticipant.name}
                      <div className="text-[10px] text-slate-400 font-normal">
                        {d.winnerParticipant.registration ? `Matrícula: ${d.winnerParticipant.registration}` : maskCPF(d.winnerParticipant.cpf)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {d.event.name}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-unifap-navy">
                      {d.prize.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {d.prize.sponsor?.name || "UniFAP"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                      {formatDateTime(d.timestamp)}
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
