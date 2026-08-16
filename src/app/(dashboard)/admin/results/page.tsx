"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/layout/EmptyState";
import { formatDateTime, maskCPF, padNumber } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function ResultsHistoryPage() {
  const [draws, setDraws] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchResults = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const res = await fetch("/api/results", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setDraws(data);
      }
    } catch (err) {
      console.error("Erro ao buscar resultados:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();

    // 1. WebSocket Event-Driven Push (Instant sync when a draw happens)
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase.channel("admin_dashboard_sync");
      channel
        .on("broadcast", { event: "dashboard_update" }, () => {
          fetchResults(true);
        })
        .subscribe();
    }

    // 2. Focus revalidation
    const handleFocus = () => fetchResults(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico Geral de Sorteios"
        subtitle="Registro oficial de todos os sorteios e contemplados nos eventos da UniFAP"
        actions={
          <button
            onClick={() => fetchResults(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-unifap-navy" : ""}`} />
            <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
          </button>
        }
      />

      <Card>
        {isLoading ? (
          <LoadingState message="Carregando histórico oficial de sorteios..." />
        ) : (
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
                        #{padNumber(d.drawnNumber || d.winnerParticipant?.ticketNumber || 0, 3)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {d.winnerParticipant?.name || d.drawnName}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {d.winnerParticipant?.registration
                            ? `Matrícula: ${d.winnerParticipant.registration}`
                            : d.winnerParticipant?.cpf
                            ? maskCPF(d.winnerParticipant.cpf)
                            : d.winnerParticipant?.category || "Participante Oficial"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {d.event?.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-unifap-navy">
                        {d.prize?.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {d.prize?.sponsor?.name || "UniFAP"}
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
        )}
      </Card>
    </div>
  );
}
