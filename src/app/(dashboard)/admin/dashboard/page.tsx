import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import {
  CalendarDays,
  Users,
  Trophy,
  Gift,
  Plus,
  PlayCircle,
  ArrowUpRight,
  ExternalLink,
  History,
  Tv,
} from "lucide-react";
import { formatDate, formatDateTime, padNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Fetch high-level statistics in parallel
  const [
    totalEvents,
    activeEventsCount,
    scheduledEventsCount,
    finishedEventsCount,
    totalParticipants,
    totalDraws,
    totalWinners,
    latestEvents,
    latestDraws,
  ] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { status: "ACTIVE" } }),
    prisma.event.count({ where: { status: "SCHEDULED" } }),
    prisma.event.count({ where: { status: "FINISHED" } }),
    prisma.participant.count(),
    prisma.draw.count(),
    prisma.winner.count(),
    prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        _count: {
          select: { participants: true, prizes: true, winners: true },
        },
      },
    }),
    prisma.draw.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      include: {
        event: { select: { id: true, name: true, slug: true } },
        prize: { select: { name: true, sponsor: { select: { name: true } } } },
        winnerParticipant: { select: { name: true, ticketNumber: true, category: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Painel Institucional"
        subtitle="Visão geral dos sorteios, eventos e participantes da UniFAP"
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/events">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Novo Evento
              </Button>
            </Link>
          </div>
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
                  {activeEventsCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-unifap-gold">
                <CalendarDays className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-200">
              <span>{scheduledEventsCount} agendado(s)</span>
              <span>{finishedEventsCount} finalizado(s)</span>
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
                  {totalParticipants}
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
                  {totalDraws}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-unifap-gold flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Execuções registradas</span>
              <span className="font-semibold text-emerald-600">Auditado</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ganhadores
                </p>
                <h3 className="text-3xl font-extrabold text-unifap-navy mt-1">
                  {totalWinners}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Prêmios distribuídos</span>
              <span className="font-semibold text-slate-700">Oficial</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Latest Events and Recent Draws */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              <span>Ver todos ({totalEvents})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {latestEvents.map((ev) => (
              <Card key={ev.id} className="hover:border-unifap-blue/40 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <StatusBadge status={ev.status} />
                    <span className="text-[11px] text-slate-400 font-medium">{formatDate(ev.date)}</span>
                  </div>
                  <CardTitle className="text-base line-clamp-1">{ev.name}</CardTitle>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center my-2">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Inscritos</div>
                      <div className="text-sm font-bold text-slate-800">{ev._count.participants}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Prêmios</div>
                      <div className="text-sm font-bold text-slate-800">{ev._count.prizes}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Sorteados</div>
                      <div className="text-sm font-bold text-emerald-600">{ev._count.winners}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Link href={`/admin/events/${ev.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        Gerenciar
                      </Button>
                    </Link>
                    <Link href={`/admin/events/${ev.id}/draw`}>
                      <Button variant="gold" size="sm" className="px-3" title="Operar Sorteio">
                        <PlayCircle className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/presentation/${ev.id}`} target="_blank">
                      <Button variant="secondary" size="sm" className="px-3" title="Abrir Telão 4K">
                        <Tv className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                      #{padNumber(d.winnerParticipant.ticketNumber, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {d.winnerParticipant.name}
                      </h4>
                      <p className="text-[11px] text-unifap-navy font-semibold truncate mt-0.5">
                        {d.prize.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <span>{d.event.name}</span>
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
    </div>
  );
}
