"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/layout/EmptyState";
import { formatDateTime, maskCPF, padNumber } from "@/lib/utils";
import {
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Filter,
  Trophy,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function ResultsHistoryPage() {
  const [draws, setDraws] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");

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

  // Extract distinct events for filtering
  const distinctEvents = useMemo(() => {
    const map = new Map<string, string>();
    draws.forEach((d) => {
      if (d.event?.id && d.event?.name) {
        map.set(d.event.id, d.event.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [draws]);

  // Client-side filtering
  const filteredDraws = useMemo(() => {
    return draws.filter((d) => {
      const matchesEvent = selectedEventId === "ALL" || d.event?.id === selectedEventId;
      if (!matchesEvent) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (d.winnerParticipant?.name || d.drawnName || "").toLowerCase();
      const email = (d.winnerParticipant?.email || "").toLowerCase();
      const registration = (d.winnerParticipant?.registration || "").toLowerCase();
      const cpf = (d.winnerParticipant?.cpf || "").replace(/\D/g, "");
      const prize = (d.prize?.name || "").toLowerCase();
      const eventName = (d.event?.name || "").toLowerCase();
      const sponsor = (d.prize?.sponsor?.name || "").toLowerCase();
      const ticket = (d.drawnNumber || d.winnerParticipant?.ticketNumber || "").toString();

      return (
        name.includes(term) ||
        email.includes(term) ||
        registration.includes(term) ||
        cpf.includes(term) ||
        prize.includes(term) ||
        eventName.includes(term) ||
        sponsor.includes(term) ||
        ticket.includes(term)
      );
    });
  }, [draws, selectedEventId, searchTerm]);

  // Dynamic export URLs
  const getExportUrl = (format: "xlsx" | "csv" | "html") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (selectedEventId !== "ALL") params.set("eventId", selectedEventId);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    return `/api/results/export?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico Geral de Sorteios"
        subtitle="Registro oficial de todos os sorteios e contemplados nos eventos da UniFAP"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchResults(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-unifap-navy" : ""}`} />
              <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
            </button>

            {/* Export buttons */}
            <a href={getExportUrl("xlsx")} download>
              <Button variant="outline" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                Excel (.xlsx)
              </Button>
            </a>

            <a href={getExportUrl("csv")} download>
              <Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4 text-blue-600" />}>
                CSV
              </Button>
            </a>

            <a href={getExportUrl("html")} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                Imprimir Ata / PDF
              </Button>
            </a>
          </div>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ganhador, bilhete, evento, prêmio, matrícula ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Event Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
            >
              <option value="ALL">Todos os Eventos ({distinctEvents.length})</option>
              {distinctEvents.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-unifap-gold" />
            <span>
              Exibindo <strong>{filteredDraws.length}</strong> de <strong>{draws.length}</strong> sorteio(s) realizado(s)
            </span>
          </div>
          {(selectedEventId !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setSelectedEventId("ALL");
                setSearchTerm("");
              }}
              className="text-xs text-unifap-navy font-semibold hover:underline"
            >
              Resetar Filtros
            </button>
          )}
        </div>
      </Card>

      {/* Results Table */}
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
                {filteredDraws.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {searchTerm || selectedEventId !== "ALL"
                        ? "Nenhum sorteio encontrado com os filtros aplicados."
                        : "Nenhum sorteio registrado ainda no sistema."}
                    </td>
                  </tr>
                ) : (
                  filteredDraws.map((d) => (
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
