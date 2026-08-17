"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import {
  CalendarDays,
  Users,
  Trophy,
  Gift,
  Plus,
  PlayCircle,
  ArrowUpRight,
  History,
  Tv,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { formatDate, formatDateTime, padNumber } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isOperator = session?.user?.role === "OPERATOR";
  const isPresenter = session?.user?.role === "PRESENTER";

  const { success, error } = useToast();
  const [data, setData] = useState<{
    metrics: {
      totalEvents: number;
      activeEventsCount: number;
      scheduledEventsCount: number;
      finishedEventsCount: number;
      totalParticipants: number;
      totalDraws: number;
      totalWinners: number;
    };
    latestEvents: any[];
    latestDraws: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/events/${eventToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir evento");

      success("Evento Excluído", `O evento "${eventToDelete.name}" foi removido.`);
      setEventToDelete(null);
      fetchDashboardData(true);
    } catch (err: any) {
      error("Erro ao excluir", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // 1. WebSocket Event-Driven Push (Instant sync on QR scan, draw or event mutation)
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase.channel("admin_dashboard_sync");
      channel
        .on("broadcast", { event: "dashboard_update" }, () => {
          fetchDashboardData(true);
        })
        .subscribe();
    }

    // 2. Focus re-validation when returning to the tab
    const handleFocus = () => fetchDashboardData(true);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const metrics = data?.metrics || {
    totalEvents: 0,
    activeEventsCount: 0,
    scheduledEventsCount: 0,
    finishedEventsCount: 0,
    totalParticipants: 0,
    totalDraws: 0,
    totalWinners: 0,
  };

  const latestEvents = data?.latestEvents || [];
  const latestDraws = data?.latestDraws || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Painel Institucional"
        subtitle="Visão geral dos sorteios, eventos e participantes da UniFAP"
        actions={
          isAdmin ? (
            <Link href="/admin/events">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Novo Evento
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <Card className="bg-gradient-to-br from-unifap-navy to-unifap-blue text-white border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                  Eventos Ativos
                </p>
                <h3 className="text-3xl font-extrabold text-white mt-1">
                  {isLoading ? "..." : metrics.activeEventsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-unifap-gold">
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
              <span>{metrics.scheduledEventsCount} agendado(s)</span>
              <span>{metrics.finishedEventsCount} finalizado(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total de Inscritos
                </p>
                <h3 className="text-3xl font-extrabold text-unifap-navy mt-1">
                  {isLoading ? "..." : metrics.totalParticipants}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-unifap-light flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Participantes cadastrados</span>
              <span className="font-semibold text-slate-700">Geral</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sorteios Realizados
                </p>
                <h3 className="text-3xl font-extrabold text-unifap-navy mt-1">
                  {isLoading ? "..." : metrics.totalDraws}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-unifap-gold flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Execuções registradas</span>
              <span className="font-semibold text-slate-700">Auditadas</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total de Ganhadores
                </p>
                <h3 className="text-3xl font-extrabold text-unifap-navy mt-1">
                  {isLoading ? "..." : metrics.totalWinners}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Participantes contemplados</span>
              <span className="font-semibold text-slate-700">UniFAP</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Events & Recent Winners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-unifap-navy flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-unifap-gold" />
              <span>Eventos Recentes</span>
            </h2>
            <Link
              href="/admin/events"
              className="text-xs font-bold text-unifap-blue hover:text-unifap-navy flex items-center gap-1 transition"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              <div className="col-span-2 py-12 text-center text-slate-400">Carregando eventos...</div>
            ) : !data?.latestEvents || data.latestEvents.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                Nenhum evento cadastrado no sistema.
              </div>
            ) : (
              data.latestEvents.map((ev) => (
                <Card key={ev.id} className="hover:border-unifap-blue/40 transition flex flex-col justify-between">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={ev.status} />
                      <span className="text-xs text-slate-400">{formatDate(ev.date)}</span>
                    </div>

                    <h3 className="font-bold text-unifap-navy text-base line-clamp-1">{ev.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                      {ev.location || "UniFAP Juazeiro do Norte"}
                    </p>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center my-3 bg-slate-50/50 rounded-xl">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Inscritos</div>
                        <div className="text-sm font-bold text-slate-800">{ev._count?.participants || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Prêmios</div>
                        <div className="text-sm font-bold text-slate-800">{ev._count?.prizes || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Sorteados</div>
                        <div className="text-sm font-bold text-emerald-600">{ev._count?.winners || 0}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Link href={`/admin/events/${ev.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold">
                          {isPresenter ? "Ver Detalhes" : "Gerenciar"}
                        </Button>
                      </Link>

                      {!isPresenter && (
                        <Link href={`/admin/events/${ev.id}/draw`}>
                          <Button variant="gold" size="sm" className="px-2.5" title="Operar Sorteio">
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}

                      <Link href={`/presentation/${ev.id}`} target="_blank" className={isPresenter ? "flex-1" : undefined}>
                        {isPresenter ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs font-bold bg-unifap-navy hover:bg-unifap-blue"
                            leftIcon={<Tv className="w-3.5 h-3.5 text-unifap-gold" />}
                          >
                            Abrir Telão 4K
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" className="px-2.5" title="Abrir Telão 4K">
                            <Tv className="w-4 h-4 text-unifap-navy" />
                          </Button>
                        )}
                      </Link>

                      {isAdmin && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200"
                          title="Excluir Evento"
                          onClick={() => setEventToDelete(ev)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent Winners Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-unifap-navy flex items-center gap-2">
              <History className="w-5 h-5 text-unifap-gold" />
              <span>Últimos Sorteados</span>
            </h2>
            <Link
              href="/admin/results"
              className="text-xs font-bold text-unifap-blue hover:text-unifap-navy flex items-center gap-1 transition"
            >
              <span>Histórico</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {latestDraws.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum sorteio registrado ainda.
                </div>
              ) : (
                latestDraws.map((d) => (
                  <div key={d.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/80 transition">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-unifap-dark font-extrabold text-sm shrink-0">
                      #{padNumber(d.drawnNumber || d.winnerParticipant?.ticketNumber || 0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {d.winnerParticipant?.name || d.drawnName}
                      </h4>
                      <p className="text-[11px] text-unifap-navy font-semibold truncate mt-0.5">
                        {d.prize?.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>{d.event?.name}</span>
                        <span>•</span>
                        <span>{formatDateTime(d.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        title="Excluir Evento Definitivamente?"
        description="Esta ação é permanente e irreversível."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              Você está prestes a excluir o evento <strong className="font-bold">{eventToDelete?.name}</strong>.
              Todos os participantes ({eventToDelete?._count?.participants || 0}), prêmios ({eventToDelete?._count?.prizes || 0}) e histórico de sorteios deste evento serão apagados.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEventToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              Sim, Excluir Evento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
