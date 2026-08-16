"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/layout/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import {
  CalendarDays,
  Plus,
  Search,
  Users,
  Trophy,
  PlayCircle,
  Tv,
  Settings,
  ExternalLink,
  MapPin,
  Clock,
} from "lucide-react";
import { formatDate, slugify } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface EventItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "FINISHED" | "ARCHIVED";
  allowRepeatWinners: boolean;
  maxParticipants?: number | null;
  _count: {
    participants: number;
    prizes: number;
    draws: number;
    winners: number;
  };
}

export default function EventsListPage() {
  const { success, error } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    date: "",
    time: "",
    location: "",
    logoUrl: "",
    coverUrl: "",
    status: "ACTIVE",
    allowRepeatWinners: false,
  });

  const fetchEvents = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao carregar eventos");
      const data = await res.json();
      setEvents(data);
    } catch (err: any) {
      if (!silent) error("Erro", err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const handleFocus = () => fetchEvents(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === slugify(prev.name) || !prev.slug ? slugify(name) : prev.slug,
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Atenção", "O nome do evento é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar evento");

      success("Sucesso!", `O evento "${data.name}" foi criado com sucesso.`);
      setIsModalOpen(false);
      setFormData({
        name: "",
        slug: "",
        description: "",
        date: "",
        time: "",
        location: "",
        logoUrl: "",
        coverUrl: "",
        status: "ACTIVE",
        allowRepeatWinners: false,
      });
      fetchEvents();
    } catch (err: any) {
      error("Erro ao criar evento", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(search.toLowerCase()) ||
      ev.slug.toLowerCase().includes(search.toLowerCase()) ||
      (ev.location && ev.location.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || ev.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos Institucionais"
        subtitle="Gerenciamento de conferências, semanas acadêmicas e sorteios"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Criar Novo Evento
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar evento por nome ou local..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["ALL", "ACTIVE", "SCHEDULED", "FINISHED", "DRAFT"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? "bg-unifap-navy text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" && "Todos"}
              {st === "ACTIVE" && "Ativos"}
              {st === "SCHEDULED" && "Agendados"}
              {st === "FINISHED" && "Finalizados"}
              {st === "DRAFT" && "Rascunhos"}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <LoadingState message="Carregando lista de eventos..." />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="Nenhum evento encontrado"
          description={
            search || statusFilter !== "ALL"
              ? "Tente ajustar seus filtros de busca."
              : "Comece criando o primeiro evento de sorteio institucional da UniFAP."
          }
          action={
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Criar Primeiro Evento
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => (
            <Card key={ev.id} className="hover:border-unifap-blue/40 flex flex-col justify-between group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={ev.status} />
                  <span className="text-xs text-slate-400 font-medium">{formatDate(ev.date)}</span>
                </div>

                <h3 className="text-lg font-bold text-unifap-navy group-hover:text-unifap-blue transition-colors line-clamp-1">
                  {ev.name}
                </h3>

                {ev.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-unifap-gold shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </p>
                )}

                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {ev.description || "Evento cadastrado no UniFAP Sorteios."}
                </p>

                {/* Counter metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center my-4 bg-slate-50/50 rounded-xl">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Inscritos</div>
                    <div className="text-sm font-extrabold text-slate-800">{ev._count.participants}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Prêmios</div>
                    <div className="text-sm font-extrabold text-slate-800">{ev._count.prizes}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Sorteados</div>
                    <div className="text-sm font-extrabold text-emerald-600">{ev._count.winners}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
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
      )}

      {/* New Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Novo Evento Institucional"
        description="Preencha os detalhes da conferência ou evento para habilitar participantes e sorteios."
        maxWidth="xl"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <Label required>Nome do Evento</Label>
            <Input
              placeholder="Ex: Semana Acadêmica de Tecnologia UniFAP 2026"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Identificador / Slug (URL)</Label>
              <Input
                placeholder="semana-academica-2026"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">Ativo (Permite inscrições)</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="DRAFT">Rascunho</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Data do Evento</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário Previsto</Label>
              <Input
                placeholder="Ex: 19:00"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Local / Espaço no Campus</Label>
            <Input
              placeholder="Ex: Auditório Principal - Bloco A"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <Label>Descrição / Informações</Label>
            <Textarea
              placeholder="Descreva a programação e objetivo do evento..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <ImageUpload
            label="Logomarca / Capa do Evento"
            helperText="Envie a logo ou arte oficial para ser projetada no telão 4K"
            folder="events"
            value={formData.logoUrl}
            onChange={(url) => setFormData({ ...formData, logoUrl: url || "", coverUrl: url || "" })}
          />

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Permitir Vencedores Repetidos?</div>
              <div className="text-[11px] text-slate-500">
                Se desmarcado, um participante sorteado ficará inelegível para os próximos prêmios do evento.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={formData.allowRepeatWinners}
              onChange={(e) => setFormData({ ...formData, allowRepeatWinners: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
