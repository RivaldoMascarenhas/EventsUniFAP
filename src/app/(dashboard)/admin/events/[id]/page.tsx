"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/layout/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Users,
  Trophy,
  Gift,
  QrCode,
  PlayCircle,
  Tv,
  FileSpreadsheet,
  Plus,
  Search,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Share2,
  FileDown,
  Lock,
  Ban,
  CheckCircle,
  X,
  Undo2,
} from "lucide-react";
import { formatDate, formatDateTime, formatCurrency, padNumber, maskCPF } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { WinnerShareModal } from "@/components/events/WinnerShareModal";
import QRCode from "qrcode";
import Image from "next/image";

export default function SingleEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isOperator = session?.user?.role === "OPERATOR";
  const isPresenter = session?.user?.role === "PRESENTER";

  const { success, error, info } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "participants" | "prizes" | "qrcode" | "results">("overview");

  // QR Code Data URI
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Participants State
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsTotal, setParticipantsTotal] = useState(0);
  const [partSearch, setPartSearch] = useState("");
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    registration: "",
    cpf: "",
    email: "",
    phone: "",
    category: "Geral",
  });
  const [participantToDelete, setParticipantToDelete] = useState<any | null>(null);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);
  const [isClearParticipantsModalOpen, setIsClearParticipantsModalOpen] = useState(false);
  const [isClearingParticipants, setIsClearingParticipants] = useState(false);

  // Import Wizard State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCsvHelpModalOpen, setIsCsvHelpModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const handleDeleteEvent = async () => {
    try {
      setIsDeletingEvent(true);
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir evento");

      success("Evento Excluído", "O evento foi removido com sucesso.");
      router.push("/admin/events");
    } catch (err: any) {
      error("Erro ao excluir", err.message);
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      "nome,matricula,cpf,curso,email,telefone\n" +
      "Lucas Alencar da Silva,202310101,08412345678,Sistemas de Informação,lucas@aluno.unifapce.edu.br,(88) 99876-5432\n" +
      "Mariana Sampaio Barreto,202310102,08423456789,Direito,mariana@aluno.unifapce.edu.br,(88) 99765-4321\n" +
      "Pedro Henrique Valença,202310103,08434567890,Fisioterapia,pedro@aluno.unifapce.edu.br,(88) 99654-3210\n" +
      "Beatriz Nogueira Lima,202310104,08445678901,Engenharia Civil,beatriz@aluno.unifapce.edu.br,(88) 99543-2109\n";

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `modelo-participantes-unifap.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    info("Download Concluído", "O arquivo modelo CSV foi baixado com sucesso.");
  };

  // Prizes State
  const [isAddPrizeModalOpen, setIsAddPrizeModalOpen] = useState(false);
  const [newPrize, setNewPrize] = useState({
    name: "",
    description: "",
    sponsorId: "",
    quantity: 1,
    estimatedValue: 0,
    order: 1,
  });

  // Edit & Delete Prize State
  const [editingPrize, setEditingPrize] = useState<any | null>(null);
  const [isEditPrizeModalOpen, setIsEditPrizeModalOpen] = useState(false);
  const [isSavingPrize, setIsSavingPrize] = useState(false);
  const [prizeToDelete, setPrizeToDelete] = useState<any | null>(null);
  const [isDeletingPrize, setIsDeletingPrize] = useState(false);
  const [editPrizeForm, setEditPrizeForm] = useState({
    name: "",
    description: "",
    sponsorId: "",
    quantity: 1,
    estimatedValue: 0,
    order: 1,
    status: "PENDING",
  });

  // Prizes Search & Filter State
  const [prizeSearch, setPrizeSearch] = useState("");
  const [prizeStatusFilter, setPrizeStatusFilter] = useState<"ALL" | "AVAILABLE" | "DRAWN">("ALL");

  // Results State
  const [results, setResults] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Cancel Draw State
  const [drawToCancel, setDrawToCancel] = useState<any | null>(null);
  const [isCancelDrawModalOpen, setIsCancelDrawModalOpen] = useState(false);
  const [cancelDrawReason, setCancelDrawReason] = useState("");
  const [cancelDrawMarkIneligible, setCancelDrawMarkIneligible] = useState(false);
  const [isCancellingDraw, setIsCancellingDraw] = useState(false);

  const handleConfirmCancelDraw = async () => {
    if (!drawToCancel) return;
    try {
      setIsCancellingDraw(true);
      const res = await fetch(`/api/events/${id}/draws/${drawToCancel.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelDrawReason || "Anulado pelo operador na ata de resultados",
          markIneligible: cancelDrawMarkIneligible,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao anular sorteio");

      success(
        "Sorteio Anulado",
        `O prêmio "${drawToCancel.prize?.name || 'do sorteio'}" voltou a ficar DISPONÍVEL para novo sorteio.`
      );
      setIsCancelDrawModalOpen(false);
      setDrawToCancel(null);
      setCancelDrawReason("");
      setCancelDrawMarkIneligible(false);

      // Refresh data
      fetchEventData(true);
      fetchParticipants();
    } catch (err: any) {
      error("Erro ao anular", err.message);
    } finally {
      setIsCancellingDraw(false);
    }
  };

  // Edit Event State
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    slug: "",
    description: "",
    date: "",
    time: "",
    location: "",
    status: "ACTIVE",
    allowRepeatWinners: false,
    maxParticipants: "",
    registrationOpenRule: "IMMEDIATE",
    registrationCustomOpensAt: "",
    logoUrl: "",
  });

  const handleOpenEditModal = () => {
    if (!event) return;
    setEditFormData({
      name: event.name || "",
      slug: event.slug || "",
      description: event.description || "",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      time: event.time || "",
      location: event.location || "",
      status: event.status || "ACTIVE",
      allowRepeatWinners: !!event.allowRepeatWinners,
      maxParticipants: event.maxParticipants !== null && event.maxParticipants !== undefined ? String(event.maxParticipants) : "",
      registrationOpenRule: event.registrationOpenRule || "IMMEDIATE",
      registrationCustomOpensAt: event.registrationCustomOpensAt ? new Date(event.registrationCustomOpensAt).toISOString().slice(0, 16) : "",
      logoUrl: event.logoUrl || event.coverUrl || "",
    });
    setIsEditEventModalOpen(true);
  };

  const handleSaveEditedEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name.trim()) {
      error("Atenção", "O nome do evento é obrigatório.");
      return;
    }

    try {
      setIsSavingEvent(true);
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          date: editFormData.date ? editFormData.date : null,
          maxParticipants: editFormData.maxParticipants ? parseInt(String(editFormData.maxParticipants), 10) : null,
          registrationOpenRule: editFormData.registrationOpenRule,
          registrationCustomOpensAt: editFormData.registrationCustomOpensAt ? editFormData.registrationCustomOpensAt : null,
          coverUrl: editFormData.logoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar evento");

      success("Evento Atualizado!", `As informações de "${data.name}" foram atualizadas com sucesso.`);
      setIsEditEventModalOpen(false);
      fetchEventData();
    } catch (err: any) {
      error("Erro ao salvar", err.message);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const fetchEventData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [resEvent, resSponsors, resResults] = await Promise.all([
        fetch(`/api/events/${id}`, { cache: "no-store" }),
        fetch("/api/sponsors", { cache: "no-store" }),
        fetch(`/api/events/${id}/results`, { cache: "no-store" }),
      ]);

      if (!resEvent.ok) throw new Error("Evento não encontrado");
      const eventData = await resEvent.json();
      setEvent(eventData);

      if (resSponsors.ok) setSponsors(await resSponsors.json());
      if (resResults.ok) setResults(await resResults.json());

      // Generate QR Code for public registration URL
      if (typeof window !== "undefined") {
        const publicUrl = `${window.location.origin}/public/event/${eventData.slug}`;
        const qrUrl = await QRCode.toDataURL(publicUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: "#002B49",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qrUrl);
      }
    } catch (err: any) {
      if (!silent) error("Erro", err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await fetch(`/api/events/${id}/participants?search=${encodeURIComponent(partSearch)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.items || []);
        setParticipantsTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEventData();

    const handleFocus = () => {
      fetchEventData(true);
      if (activeTab === "participants") fetchParticipants();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [id]);

  useEffect(() => {
    if (activeTab === "participants") {
      fetchParticipants();
    } else if (activeTab === "results" || activeTab === "prizes") {
      fetchEventData(true);
    }
  }, [activeTab, partSearch]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/events/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newParticipant),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao adicionar participante");

      success("Participante Adicionado!", `${data.name} recebeu o bilhete #${padNumber(data.ticketNumber, 3)}.`);
      setIsAddParticipantModalOpen(false);
      setNewParticipant({ name: "", registration: "", cpf: "", email: "", phone: "", category: "Geral" });
      fetchParticipants();
      fetchEventData(true);
    } catch (err: any) {
      error("Erro", err.message);
    }
  };

  const handleConfirmDeleteParticipant = async () => {
    if (!participantToDelete) return;
    try {
      setIsDeletingParticipant(true);
      const res = await fetch(`/api/events/${id}/participants/${participantToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir participante");

      success("Participante Excluído!", data.message || `Participante ${participantToDelete.name} foi removido.`);
      setParticipantToDelete(null);
      fetchParticipants();
      fetchEventData(true);
    } catch (err: any) {
      error("Erro ao excluir participante", err.message);
    } finally {
      setIsDeletingParticipant(false);
    }
  };

  const handleToggleEligibility = async (participant: any) => {
    try {
      const nextEligible = !participant.isEligible;
      const res = await fetch(`/api/events/${id}/participants/${participant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEligible: nextEligible }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar elegibilidade");

      info(
        "Status Atualizado",
        nextEligible
          ? `${participant.name} agora está ELEGÍVEL para sorteios.`
          : `${participant.name} foi marcado como INELEGÍVEL.`
      );
      fetchParticipants();
      fetchEventData(true);
    } catch (err: any) {
      error("Erro", err.message);
    }
  };

  const handleConfirmClearAllParticipants = async () => {
    try {
      setIsClearingParticipants(true);
      const res = await fetch(`/api/events/${id}/participants`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao limpar participantes");

      success("Lista Limpa com Sucesso!", data.message || "Todos os participantes não-ganhadores foram removidos.");
      setIsClearParticipantsModalOpen(false);
      fetchParticipants();
      fetchEventData(true);
    } catch (err: any) {
      error("Erro ao limpar lista", err.message);
    } finally {
      setIsClearingParticipants(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsImporting(true);
      const res = await fetch(`/api/events/${id}/participants/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao analisar arquivo");
      setImportPreview(data);
    } catch (err: any) {
      error("Erro na leitura da planilha", err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview || !importPreview.previewRows) return;
    const validRows = importPreview.previewRows.filter((r: any) => r.isValid);

    try {
      setIsImporting(true);
      const res = await fetch(`/api/events/${id}/participants/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao importar dados");

      success("Importação Concluída!", `${data.importedCount} participantes foram adicionados com sucesso.`);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      fetchParticipants();
      fetchEventData();
    } catch (err: any) {
      error("Erro na importação", err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPrize,
          eventId: id,
          sponsorId: newPrize.sponsorId || null,
          estimatedValue: Number(newPrize.estimatedValue) || null,
          quantity: Number(newPrize.quantity) || 1,
          order: Number(newPrize.order) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar prêmio");

      success("Prêmio Cadastrado!", `O prêmio "${data.name}" foi associado ao evento.`);
      setIsAddPrizeModalOpen(false);
      setNewPrize({ name: "", description: "", sponsorId: "", quantity: 1, estimatedValue: 0, order: 1 });
      fetchEventData();
    } catch (err: any) {
      error("Erro", err.message);
    }
  };

  const handleOpenEditPrize = (prize: any) => {
    setEditingPrize(prize);
    setEditPrizeForm({
      name: prize.name || "",
      description: prize.description || "",
      sponsorId: prize.sponsorId || "",
      quantity: prize.quantity || 1,
      estimatedValue: prize.estimatedValue || 0,
      order: prize.order || 1,
      status: prize.status || "PENDING",
    });
    setIsEditPrizeModalOpen(true);
  };

  const handleSaveEditPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;

    try {
      setIsSavingPrize(true);
      const res = await fetch(`/api/prizes/${editingPrize.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editPrizeForm,
          sponsorId: editPrizeForm.sponsorId || null,
          estimatedValue: Number(editPrizeForm.estimatedValue) || null,
          quantity: Number(editPrizeForm.quantity) || 1,
          order: Number(editPrizeForm.order) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar prêmio");

      success("Prêmio Atualizado!", `As alterações no prêmio "${data.name}" foram salvas.`);
      setIsEditPrizeModalOpen(false);
      setEditingPrize(null);
      fetchEventData();
    } catch (err: any) {
      error("Erro ao salvar prêmio", err.message);
    } finally {
      setIsSavingPrize(false);
    }
  };

  const handleConfirmDeletePrize = async () => {
    if (!prizeToDelete) return;

    try {
      setIsDeletingPrize(true);
      const res = await fetch(`/api/prizes/${prizeToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir prêmio");

      success("Prêmio Excluído!", `O prêmio "${prizeToDelete.name}" foi removido.`);
      setPrizeToDelete(null);
      fetchEventData();
    } catch (err: any) {
      error("Erro ao excluir prêmio", err.message);
    } finally {
      setIsDeletingPrize(false);
    }
  };

  const copyPublicUrl = () => {
    if (typeof window !== "undefined" && event) {
      const publicUrl = `${window.location.origin}/public/event/${event.slug}`;
      navigator.clipboard.writeText(publicUrl);
      info("Link Copiado!", "O link público de inscrição foi copiado para a área de transferência.");
    }
  };

  if (isLoading) return <LoadingState message="Carregando detalhes do evento..." />;
  if (!event) return <EmptyState title="Evento não encontrado" description="O evento solicitado não existe ou foi removido." />;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Eventos", href: "/admin/events" },
          { label: event.name },
        ]}
        title={event.name}
        subtitle={`${formatDate(event.date)} ${event.time ? `às ${event.time}` : ""} • ${event.location || "UniFAP"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                leftIcon={<Edit className="w-4 h-4" />}
                onClick={handleOpenEditModal}
              >
                Editar Evento
              </Button>
            )}

            {!isPresenter && (
              <Link href={`/admin/events/${event.id}/draw`}>
                <Button variant="gold" leftIcon={<PlayCircle className="w-4 h-4" />}>
                  Operar Sorteio
                </Button>
              </Link>
            )}

            <Link href={`/presentation/${event.id}`} target="_blank">
              <Button variant="primary" leftIcon={<Tv className="w-4 h-4" />}>
                Telão 4K
              </Button>
            </Link>

            {isAdmin && (
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Excluir
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 bg-white px-4 rounded-2xl shadow-sm overflow-x-auto">
        {[
          { key: "overview", label: "Visão Geral", icon: ShieldCheck },
          { key: "participants", label: `Participantes (${event._count.participants})`, icon: Users },
          { key: "prizes", label: `Prêmios (${event._count.prizes})`, icon: Trophy },
          { key: "qrcode", label: "QR Code & Link Público", icon: QrCode },
          { key: "results", label: `Resultados (${results.length})`, icon: Gift },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-unifap-navy text-unifap-navy"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-unifap-gold" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações do Evento</CardTitle>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  onClick={handleOpenEditModal}
                >
                  Editar Dados
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                  <div className="mt-1"><StatusBadge status={event.status} /></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Capacidade Máxima</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {event.maxParticipants ? `${event.maxParticipants} vagas` : "Ilimitada"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Abertura das Inscrições</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {event.registrationOpenRule === "1_HOUR_BEFORE"
                      ? "1h Antes do Evento"
                      : event.registrationOpenRule === "2_HOURS_BEFORE"
                      ? "2h Antes do Evento"
                      : event.registrationOpenRule === "ON_EVENT_START"
                      ? "No Início do Evento"
                      : event.registrationOpenRule === "CUSTOM"
                      ? "Data Personalizada"
                      : "Abertas (Imediato)"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Repetição de Ganhadores</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {event.allowRepeatWinners ? "Permitida" : "Bloqueada (Exclusivo)"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Slug Oficial</div>
                  <div className="text-xs font-mono font-bold text-unifap-navy mt-1 truncate">{event.slug}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição</h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                  {event.description || "Nenhuma descrição fornecida para este evento."}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Identidade Visual do Evento</h4>
                <ImageUpload
                  label="Logomarca / Capa do Evento"
                  helperText="Esta imagem será exibida no telão quando você acionar 'Projetar Logo do Evento'."
                  folder="events"
                  value={event.logoUrl || event.coverUrl}
                  onChange={async (newUrl) => {
                    try {
                      const res = await fetch(`/api/events/${event.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          logoUrl: newUrl,
                          coverUrl: newUrl,
                        }),
                      });
                      if (!res.ok) throw new Error("Erro ao atualizar logomarca");
                      setEvent((prev: any) => ({ ...prev, logoUrl: newUrl, coverUrl: newUrl }));
                      success("Logomarca Atualizada!", "A nova imagem foi salva com sucesso.");
                    } catch (err: any) {
                      error("Erro", err.message);
                    }
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("qrcode")}>
                  Ver QR Code para Telão
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("participants")}>
                  Importar Lista de Alunos
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Metrics */}
          <div className="space-y-4">
            <Card className="bg-unifap-navy text-white border-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-unifap-gold">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <Badge variant="gold">Oficial</Badge>
                </div>
                <div className="text-2xl font-black">{event._count.winners} / {event._count.prizes}</div>
                <p className="text-xs text-blue-200 mt-1">Prêmios já contemplados neste evento</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Link Público</h4>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 truncate mb-3">
                  {typeof window !== "undefined" ? `${window.location.origin}/public/event/${event.slug}` : ""}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={copyPublicUrl}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copiar Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Participants */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full lg:w-80">
              <Input
                placeholder="Buscar por nome, matrícula, CPF..."
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="pr-8"
              />
              {partSearch && (
                <button
                  type="button"
                  onClick={() => setPartSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={`/api/events/${event.id}/export?type=participants&format=xlsx`}
                  download
                  title="Exportar lista de participantes em formato Excel"
                >
                  <Button variant="outline" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                    Excel
                  </Button>
                </a>

                <a
                  href={`/api/events/${event.id}/export?type=participants&format=html`}
                  target="_blank"
                  title="Imprimir lista oficial de participantes ou salvar em PDF"
                >
                  <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4 text-unifap-navy" />}>
                    PDF
                  </Button>
                </a>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<HelpCircle className="w-4 h-4 text-unifap-gold" />}
                  onClick={() => setIsCsvHelpModalOpen(true)}
                  title="Como deve ser o arquivo CSV ou Excel?"
                >
                  Ajuda CSV
                </Button>
              </div>

              {!isPresenter && (
                <div className="flex items-center gap-2 ml-auto">
                  {isAdmin && participantsTotal > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                      onClick={() => setIsClearParticipantsModalOpen(true)}
                      title="Remover todos os inscritos não-ganhadores deste evento"
                    >
                      Limpar Lista
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    Importar CSV
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddParticipantModalOpen(true)}
                  >
                    + Adicionar Manual
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4 text-center">Nº Bilhete</th>
                    <th className="py-3 px-4">Nome do Participante</th>
                    <th className="py-3 px-4">Matrícula / CPF</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {!isPresenter && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {participants.length === 0 ? (
                    <tr>
                      <td colSpan={isPresenter ? 5 : 6} className="py-8 text-center text-slate-400">
                        Nenhum participante encontrado. Use a importação ou cadastro manual.
                      </td>
                    </tr>
                  ) : (
                    participants.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-center font-extrabold text-unifap-navy font-mono">
                          #{padNumber(p.ticketNumber, 3)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {p.name}
                          {p.email && <div className="text-[10px] text-slate-400 font-normal">{p.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {p.registration ? `Matr: ${p.registration}` : maskCPF(p.cpf)}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{p.category || "Geral"}</td>
                        <td className="py-3 px-4 text-center">
                          {p.isWinner ? (
                            <Badge variant="gold">★ Vencedor</Badge>
                          ) : p.isEligible ? (
                            <Badge variant="success">Elegível</Badge>
                          ) : (
                            <Badge variant="danger">Inelegível</Badge>
                          )}
                        </td>
                        {!isPresenter && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleEligibility(p)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                                  p.isEligible
                                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                }`}
                                title={p.isEligible ? "Tornar Inelegível para sorteios" : "Tornar Elegível para sorteios"}
                              >
                                {p.isEligible ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => setParticipantToDelete(p)}
                                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                title="Excluir Participante"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Prizes */}
      {activeTab === "prizes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-unifap-navy uppercase tracking-wider">
                Prêmios Cadastrados para este Evento
              </h3>
              <div className="text-xs text-slate-500 mt-0.5">
                Gerencie todos os prêmios, patrocinadores e ordem de sorteio.
              </div>
            </div>
            {!isPresenter && (
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddPrizeModalOpen(true)}
              >
                Novo Prêmio
              </Button>
            )}
          </div>

          {/* Smart Search & Status Filters */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nome, patrocinador, descrição ou #..."
                value={prizeSearch}
                onChange={(e) => setPrizeSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
              />
              {prizeSearch && (
                <button
                  type="button"
                  onClick={() => setPrizeSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setPrizeStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  prizeStatusFilter === "ALL"
                    ? "bg-unifap-navy text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
                  {event.prizes?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrizeStatusFilter("AVAILABLE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  prizeStatusFilter === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>Disponíveis</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/20">
                  {(event.prizes || []).filter((p: any) => p.status === "AVAILABLE").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPrizeStatusFilter("DRAWN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  prizeStatusFilter === "DRAWN"
                    ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>Sorteados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/10">
                  {(event.prizes || []).filter((p: any) => p.status === "DRAWN" || p.status === "FINISHED").length}
                </span>
              </button>
            </div>
          </div>

          {/* Prizes Grid */}
          {(() => {
            const filteredPrizes = (event?.prizes || []).filter((p: any) => {
              const matchesStatus =
                prizeStatusFilter === "ALL" ||
                (prizeStatusFilter === "AVAILABLE" && p.status === "AVAILABLE") ||
                (prizeStatusFilter === "DRAWN" && (p.status === "DRAWN" || p.status === "FINISHED"));

              if (!matchesStatus) return false;

              if (!prizeSearch.trim()) return true;
              const q = prizeSearch.toLowerCase().trim();
              const orderMatch = `#${p.order}`.toLowerCase().includes(q) || String(p.order) === q;
              const nameMatch = p.name?.toLowerCase().includes(q);
              const sponsorMatch = p.sponsor?.name?.toLowerCase().includes(q);
              const descMatch = p.description?.toLowerCase().includes(q);
              return Boolean(orderMatch || nameMatch || sponsorMatch || descMatch);
            });

            if (filteredPrizes.length === 0) {
              return (
                <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-700">Nenhum prêmio encontrado</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {prizeSearch
                      ? `Não encontramos nenhum prêmio correspondente a "${prizeSearch}".`
                      : "Nenhum prêmio cadastrado nesta categoria de status."}
                  </p>
                  {(prizeSearch || prizeStatusFilter !== "ALL") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPrizeSearch("");
                        setPrizeStatusFilter("ALL");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrizes.map((prize: any) => {
                  const isFinalized = prize.status === "DRAWN" || prize.status === "FINISHED";
                  const canEdit = isAdmin || (!isFinalized && isOperator);
                  const canDelete = isAdmin || (!isFinalized && isOperator);

                  return (
                    <Card key={prize.id} className="flex flex-col justify-between hover:border-unifap-blue/40">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-7 h-7 rounded-lg bg-unifap-navy text-white text-xs font-bold flex items-center justify-center">
                            #{prize.order}
                          </span>
                          <StatusBadge status={prize.status} />
                        </div>

                        <h4 className="text-base font-bold text-unifap-navy line-clamp-1">{prize.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {prize.description || "Sem descrição."}
                        </p>

                        {/* Sponsor highlight */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Patrocínio</div>
                            <div className="text-xs font-bold text-unifap-navy">
                              {prize.sponsor?.name || "UniFAP"}
                            </div>
                          </div>
                          {prize.estimatedValue && (
                            <div className="text-right">
                              <div className="text-[10px] uppercase font-bold text-slate-400">Valor Estimado</div>
                              <div className="text-xs font-bold text-emerald-600">
                                {formatCurrency(prize.estimatedValue)}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {!isPresenter && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            {canEdit ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => handleOpenEditPrize(prize)}
                                leftIcon={<Edit className="w-3.5 h-3.5" />}
                              >
                                Editar
                              </Button>
                            ) : (
                              <div
                                className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[11px] font-semibold flex items-center justify-center gap-1.5 select-none"
                                title="Prêmio já finalizado. Apenas administradores têm permissão para editar."
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Restrito ao Admin</span>
                              </div>
                            )}

                            {canDelete && (
                              <Button
                                variant="danger"
                                size="sm"
                                className="px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200"
                                title={isFinalized ? "Excluir Prêmio Finalizado (Ação Admin)" : "Excluir Prêmio"}
                                onClick={() => setPrizeToDelete(prize)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: QR Code & Public Link */}
      {activeTab === "qrcode" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-4">
            <Badge variant="gold">Inscrição Instantânea</Badge>
            <h3 className="text-2xl font-extrabold text-unifap-navy tracking-tight">
              QR Code Oficial do Evento
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Exiba este QR Code no telão do auditório ou projete nos slides para que os participantes e estudantes possam se inscrever diretamente pelo celular.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-bold uppercase text-slate-500 mb-1">URL Pública de Inscrição:</div>
              <div className="text-xs font-mono font-bold text-unifap-navy break-all">
                {typeof window !== "undefined" ? `${window.location.origin}/public/event/${event.slug}` : ""}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!isPresenter && (
                <Button
                  variant="gold"
                  onClick={async () => {
                    try {
                      await fetch(`/api/events/${event.id}/realtime`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "qr:show",
                          state: "SHOWING_QR_CODE",
                        }),
                      });
                      success("Telão 4K", "QR Code de inscrição projetado no telão!");
                    } catch {
                      error("Erro", "Falha ao enviar comando para o telão.");
                    }
                  }}
                  leftIcon={<Sparkles className="w-4 h-4 text-slate-950" />}
                >
                  Projetar no Telão 4K
                </Button>
              )}

              <Button variant="primary" onClick={copyPublicUrl} leftIcon={<Copy className="w-4 h-4" />}>
                Copiar Link
              </Button>
              <a
                href={qrCodeDataUrl}
                download={`qrcode-${event.slug}.png`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition"
              >
                <Download className="w-4 h-4" />
                Baixar Imagem
              </a>
            </div>
          </div>

          <div className="flex justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code do Evento"
                className="w-64 h-64 rounded-xl shadow-lg border border-white"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">Gerando QR Code...</div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Results */}
      {activeTab === "results" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-unifap-navy uppercase tracking-wider">
              Ata de Ganhadores e Sorteios Realizados
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => setIsShareModalOpen(true)}
                leftIcon={<Share2 className="w-4 h-4 text-slate-950" />}
              >
                Divulgar no WhatsApp / Card
              </Button>
              <a href={`/api/events/${event.id}/export?format=xlsx`} download>
                <Button variant="outline" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                  Exportar Excel (.xlsx)
                </Button>
              </a>
              <a href={`/api/events/${event.id}/export?format=html`} target="_blank">
                <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4 text-unifap-navy" />}>
                  Relatório PDF / Imprimir
                </Button>
              </a>
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-4 text-center">Nº Sorteado</th>
                    <th className="py-3 px-4">Ganhador</th>
                    <th className="py-3 px-4">Prêmio Conquistado</th>
                    <th className="py-3 px-4">Patrocinador</th>
                    <th className="py-3 px-4 text-right">Data / Hora</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum sorteio registrado ainda para este evento.
                      </td>
                    </tr>
                  ) : (
                    results.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-center font-black text-unifap-navy font-mono">
                          #{padNumber(d.drawnNumber || d.winnerParticipant.ticketNumber, 3)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {d.winnerParticipant.name}
                          <div className="text-[10px] text-slate-400 font-normal">
                            {d.winnerParticipant.registration ? `Matrícula: ${d.winnerParticipant.registration}` : maskCPF(d.winnerParticipant.cpf)}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-unifap-navy">{d.prize.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {d.prize.sponsor?.name || "UniFAP"}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatDateTime(d.timestamp)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isPresenter && (
                            <button
                              type="button"
                              onClick={() => {
                                setDrawToCancel(d);
                                setIsCancelDrawModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold transition shadow-sm"
                              title="Anular este sorteio e devolver o prêmio para a lista de disponíveis"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>Anular</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Manual Add Participant */}
      <Modal
        isOpen={isAddParticipantModalOpen}
        onClose={() => setIsAddParticipantModalOpen(false)}
        title="Adicionar Participante Manualmente"
        description="O número do bilhete será gerado automaticamente pelo servidor."
      >
        <form onSubmit={handleAddParticipant} className="space-y-4">
          <div>
            <Label required>Nome Completo</Label>
            <Input
              placeholder="Ex: João da Silva Santos"
              value={newParticipant.name}
              onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Matrícula Acadêmica</Label>
              <Input
                placeholder="202310100"
                value={newParticipant.registration}
                onChange={(e) => setNewParticipant({ ...newParticipant, registration: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={newParticipant.cpf}
                onChange={(e) => setNewParticipant({ ...newParticipant, cpf: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="aluno@unifapce.edu.br"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input
                placeholder="(88) 99999-9999"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Categoria / Curso</Label>
            <Input
              placeholder="Ex: Sistemas de Informação"
              value={newParticipant.category}
              onChange={(e) => setNewParticipant({ ...newParticipant, category: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddParticipantModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Cadastrar Participante
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Import Wizard */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreview(null);
          setImportFile(null);
        }}
        title="Assistente de Importação em Lote"
        description="Faça upload de planilhas CSV, XLS ou XLSX para cadastrar participantes automaticamente."
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Quick Help & Template Download Banner */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-unifap-navy flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-unifap-blue" />
                <span>Colunas suportadas pelo importador</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                Colunas aceitas: <strong>Nome</strong>, <strong>Matrícula ou CPF</strong>, <strong>Curso/Categoria</strong>, <strong>E-mail</strong> e <strong>Telefone</strong>.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadCsvTemplate}
              leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}
              className="bg-white shrink-0 shadow-sm"
            >
              Baixar Modelo (.csv)
            </Button>
          </div>

          {!importPreview ? (
            <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50 hover:bg-slate-100 transition">
              <input
                type="file"
                id="file-upload"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <FileSpreadsheet className="w-12 h-12 text-unifap-navy mb-3" />
                <span className="text-sm font-bold text-slate-800">
                  Clique aqui para selecionar seu arquivo
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: CSV, Excel (.xlsx, .xls)
                </span>
              </label>
              {isImporting && <p className="text-xs font-semibold text-unifap-blue mt-4">Processando arquivo...</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <div className="text-xs text-slate-500 font-medium">Total de Linhas</div>
                  <div className="text-lg font-bold text-slate-800">{importPreview.totalRows}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-medium">Válidos para Importação</div>
                  <div className="text-lg font-bold text-emerald-700">{importPreview.validRowsCount}</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-xs text-rose-600 font-medium">Erros / Duplicados</div>
                  <div className="text-lg font-bold text-rose-700">{importPreview.invalidRowsCount}</div>
                </div>
              </div>

              {/* Preview table */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Linha</th>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Matrícula</th>
                      <th className="p-2.5">CPF</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.previewRows.map((r: any) => (
                      <tr key={r.rowNumber} className={r.isValid ? "hover:bg-slate-50" : "bg-rose-50/50"}>
                        <td className="p-2.5 font-mono text-slate-400">#{r.rowNumber}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{r.name || "-"}</td>
                        <td className="p-2.5 text-slate-600">{r.registration || "-"}</td>
                        <td className="p-2.5 text-slate-600">{r.cpf || "-"}</td>
                        <td className="p-2.5">
                          {r.isValid ? (
                            <span className="text-emerald-600 font-bold">✔ Válido</span>
                          ) : (
                            <span className="text-rose-600 font-bold" title={r.errors?.join(", ")}>
                              ✖ {r.errors?.[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                >
                  Trocar Arquivo
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCommitImport}
                  isLoading={isImporting}
                  disabled={importPreview.validRowsCount === 0}
                >
                  Importar {importPreview.validRowsCount} Participantes
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Add Prize */}
      <Modal
        isOpen={isAddPrizeModalOpen}
        onClose={() => setIsAddPrizeModalOpen(false)}
        title="Cadastrar Novo Prêmio"
        description="Associe o prêmio ao evento e defina o patrocinador responsável."
      >
        <form onSubmit={handleAddPrize} className="space-y-4">
          <div>
            <Label required>Nome do Prêmio</Label>
            <Input
              placeholder="Ex: Notebook Dell Inspiron i5"
              value={newPrize.name}
              onChange={(e) => setNewPrize({ ...newPrize, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Patrocinador Responsável</Label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-unifap-navy"
              value={newPrize.sponsorId}
              onChange={(e) => setNewPrize({ ...newPrize, sponsorId: e.target.value })}
            >
              <option value="">UniFAP (Próprio da Instituição)</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={newPrize.quantity}
                onChange={(e) => setNewPrize({ ...newPrize, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label>Valor Estimado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1500.00"
                value={newPrize.estimatedValue || ""}
                onChange={(e) => setNewPrize({ ...newPrize, estimatedValue: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>Descrição / Especificações</Label>
            <Textarea
              placeholder="Ex: Processador Intel i5, 16GB RAM, SSD 512GB..."
              value={newPrize.description}
              onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddPrizeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Prêmio
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Prize */}
      <Modal
        isOpen={isEditPrizeModalOpen}
        onClose={() => {
          setIsEditPrizeModalOpen(false);
          setEditingPrize(null);
        }}
        title="Editar Dados do Prêmio"
        description="Atualize as informações, patrocinador ou ordem do prêmio."
      >
        <form onSubmit={handleSaveEditPrize} className="space-y-4">
          <div>
            <Label required>Nome do Prêmio</Label>
            <Input
              value={editPrizeForm.name}
              onChange={(e) => setEditPrizeForm({ ...editPrizeForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Patrocinador Responsável</Label>
            <select
              className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-unifap-navy"
              value={editPrizeForm.sponsorId}
              onChange={(e) => setEditPrizeForm({ ...editPrizeForm, sponsorId: e.target.value })}
            >
              <option value="">UniFAP (Próprio da Instituição)</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label>Ordem do Sorteio</Label>
              <Input
                type="number"
                min="1"
                value={editPrizeForm.order}
                onChange={(e) => setEditPrizeForm({ ...editPrizeForm, order: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={editPrizeForm.quantity}
                onChange={(e) => setEditPrizeForm({ ...editPrizeForm, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={editPrizeForm.status}
                onChange={(e) => setEditPrizeForm({ ...editPrizeForm, status: e.target.value })}
              >
                <option value="PENDING">Pendente</option>
                <option value="DRAWING">Sorteando</option>
                <option value="DRAWN">Sorteado</option>
                <option value="DELIVERED">Entregue</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Valor Estimado (R$)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="1500.00"
              value={editPrizeForm.estimatedValue || ""}
              onChange={(e) => setEditPrizeForm({ ...editPrizeForm, estimatedValue: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Label>Descrição / Especificações</Label>
            <Textarea
              value={editPrizeForm.description}
              onChange={(e) => setEditPrizeForm({ ...editPrizeForm, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditPrizeModalOpen(false);
                setEditingPrize(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSavingPrize}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Prize Confirmation */}
      <Modal
        isOpen={!!prizeToDelete}
        onClose={() => setPrizeToDelete(null)}
        title="Excluir Prêmio Definitivamente?"
        description="Esta ação removerá o prêmio da lista do evento."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              Você está prestes a excluir o prêmio <strong className="font-bold">{prizeToDelete?.name}</strong>.
              Caso este prêmio já tenha sido sorteado, o registro do sorteio associado também será limpo.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPrizeToDelete(null)}
              disabled={isDeletingPrize}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeletingPrize}
              onClick={handleConfirmDeletePrize}
            >
              Sim, Excluir Prêmio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Event Details */}
      <Modal
        isOpen={isEditEventModalOpen}
        onClose={() => setIsEditEventModalOpen(false)}
        title="Editar Informações do Evento"
        description="Atualize a data, local, status e configurações do evento institucional."
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEditedEvent} className="space-y-4">
          <div>
            <Label required>Nome do Evento</Label>
            <Input
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Slug / URL</Label>
              <Input
                value={editFormData.slug}
                onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Status do Evento</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              >
                <option value="ACTIVE">Ativo (Inscrições e Sorteios Abertos)</option>
                <option value="SCHEDULED">Agendado</option>
                <option value="DRAFT">Rascunho</option>
                <option value="FINISHED">Concluído / Encerrado</option>
                <option value="ARCHIVED">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Data do Evento</Label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Horário Previsto</Label>
              <Input
                placeholder="Ex: 19:00"
                value={editFormData.time}
                onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Capacidade Máx. de Participantes</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 100, 200, 500"
                value={editFormData.maxParticipants}
                onChange={(e) => setEditFormData({ ...editFormData, maxParticipants: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Os bilhetes do QR Code serão gerados aleatoriamente dentro deste intervalo.
              </p>
            </div>
            <div>
              <Label>Local / Campus</Label>
              <Input
                placeholder="Ex: Auditório Principal — Campus UniFAP Juazeiro do Norte"
                value={editFormData.location}
                onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Descrição / Objetivo</Label>
            <Textarea
              placeholder="Descrição do evento..."
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <ImageUpload
            label="Logomarca / Capa do Evento"
            helperText="Esta imagem será exibida no telão quando você acionar 'Projetar Logo do Evento'."
            folder="events"
            value={editFormData.logoUrl}
            onChange={(url) => setEditFormData({ ...editFormData, logoUrl: url || "" })}
          />

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3">
            <div>
              <Label required>Regra de Abertura das Inscrições (QR Code)</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={editFormData.registrationOpenRule}
                onChange={(e) => setEditFormData({ ...editFormData, registrationOpenRule: e.target.value })}
              >
                <option value="IMMEDIATE">Abertas Imediatamente (desde a criação/agendamento)</option>
                <option value="1_HOUR_BEFORE">1 Hora Antes do Início do Evento</option>
                <option value="2_HOURS_BEFORE">2 Horas Antes do Início do Evento</option>
                <option value="ON_EVENT_START">No Horário de Início do Evento</option>
                <option value="CUSTOM">Data e Horário Personalizado</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Define quando os participantes poderão escanear o QR Code e emitir seus bilhetes da sorte.
              </p>
            </div>

            {editFormData.registrationOpenRule === "CUSTOM" && (
              <div>
                <Label required>Data e Hora de Abertura das Inscrições</Label>
                <Input
                  type="datetime-local"
                  value={editFormData.registrationCustomOpensAt}
                  onChange={(e) => setEditFormData({ ...editFormData, registrationCustomOpensAt: e.target.value })}
                  required
                />
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Permitir Vencedores Repetidos?</div>
              <div className="text-[11px] text-slate-500">
                Se desmarcado, um participante já contemplado não participará das próximas rodadas de sorteio deste evento.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={editFormData.allowRepeatWinners}
              onChange={(e) => setEditFormData({ ...editFormData, allowRepeatWinners: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditEventModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSavingEvent}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: CSV / Excel Help & Documentation */}
      <Modal
        isOpen={isCsvHelpModalOpen}
        onClose={() => setIsCsvHelpModalOpen(false)}
        title="Estrutura do Arquivo CSV / Excel"
        description="Como formatar sua planilha para importação automática de participantes e estudantes."
        maxWidth="2xl"
      >
        <div className="space-y-5 text-slate-700 text-xs">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-amber-900">
            <div className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-unifap-gold" />
              <span>Regra de Cabeçalhos e Nomes das Colunas</span>
            </div>
            <p>
              O sistema reconhece automaticamente os cabeçalhos em português e inglês (com ou sem acentuação).
            </p>
          </div>

          {/* Columns Table Guide */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                  <th className="py-2.5 px-3">Coluna</th>
                  <th className="py-2.5 px-3">Obrigatório?</th>
                  <th className="py-2.5 px-3">Exemplos Aceitos</th>
                  <th className="py-2.5 px-3">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-unifap-navy">nome</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">Sim</td>
                  <td className="py-2.5 px-3 text-slate-600">"Lucas Silva", "Ana Clara"</td>
                  <td className="py-2.5 px-3 text-slate-500">Nome completo do participante</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-unifap-navy">matricula / cpf</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">Sim</td>
                  <td className="py-2.5 px-3 text-slate-600">"202310101" ou "084.123.456-78"</td>
                  <td className="py-2.5 px-3 text-slate-500">Evita duplicidade no mesmo evento</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-unifap-navy">curso / categoria</td>
                  <td className="py-2.5 px-3 text-slate-500 font-semibold">Opcional</td>
                  <td className="py-2.5 px-3 text-slate-600">"Direito", "Fisioterapia", "Professor"</td>
                  <td className="py-2.5 px-3 text-slate-500">Aparece na tela de resultado do telão</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-unifap-navy">email</td>
                  <td className="py-2.5 px-3 text-slate-500 font-semibold">Opcional</td>
                  <td className="py-2.5 px-3 text-slate-600">"aluno@unifapce.edu.br"</td>
                  <td className="py-2.5 px-3 text-slate-500">Notificação oficial de contemplado</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-unifap-navy">telefone</td>
                  <td className="py-2.5 px-3 text-slate-500 font-semibold">Opcional</td>
                  <td className="py-2.5 px-3 text-slate-600">"(88) 99999-9999"</td>
                  <td className="py-2.5 px-3 text-slate-500">Contato por WhatsApp</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Sample CSV preview */}
          <div>
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
              Exemplo de Arquivo CSV (formato texto separado por vírgula):
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`nome,matricula,cpf,curso,email,telefone
Lucas Alencar da Silva,202310101,08412345678,Sistemas de Informação,lucas@aluno.unifapce.edu.br,(88) 99876-5432
Mariana Sampaio Barreto,202310102,08423456789,Direito,mariana@aluno.unifapce.edu.br,(88) 99765-4321
Pedro Henrique Valença,202310103,08434567890,Fisioterapia,pedro@aluno.unifapce.edu.br,(88) 99654-3210`}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={downloadCsvTemplate}
              leftIcon={<FileDown className="w-4 h-4 text-emerald-600" />}
            >
              Baixar Arquivo Modelo (.csv)
            </Button>
            <Button type="button" variant="primary" onClick={() => setIsCsvHelpModalOpen(false)}>
              Entendi, Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Event Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Evento Definitivamente?"
        description="Esta ação é permanente e irreversível."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              Você está prestes a excluir permanentemente o evento <strong className="font-bold">{event?.name}</strong>.
              Todos os participantes ({event?._count?.participants || 0}), prêmios ({event?._count?.prizes || 0}) e histórico de sorteios deste evento serão apagados definitivamente.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingEvent}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={isDeletingEvent}
              onClick={handleDeleteEvent}
            >
              Sim, Excluir Evento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Delete Single Participant */}
      <Modal
        isOpen={Boolean(participantToDelete)}
        onClose={() => setParticipantToDelete(null)}
        title="Excluir Participante"
        description="Tem certeza que deseja remover este participante do evento?"
      >
        {participantToDelete && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-sm font-bold text-slate-900">{participantToDelete.name}</div>
              <div className="text-xs text-slate-600 font-mono">
                Bilhete: #{padNumber(participantToDelete.ticketNumber, 3)}
              </div>
              {participantToDelete.registration && (
                <div className="text-xs text-slate-500">Matrícula: {participantToDelete.registration}</div>
              )}
            </div>

            {participantToDelete.isWinner && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                ⚠️ <strong>Atenção:</strong> Este participante foi contemplado como ganhador em sorteios deste evento. A exclusão removerá sua vaga.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setParticipantToDelete(null)}
                disabled={isDeletingParticipant}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDeleteParticipant}
                isLoading={isDeletingParticipant}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Sim, Excluir Participante
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Confirm Clear All Participants */}
      <Modal
        isOpen={isClearParticipantsModalOpen}
        onClose={() => setIsClearParticipantsModalOpen(false)}
        title="Limpar Todos os Participantes"
        description="Esta ação removerá todos os participantes não-ganhadores inscritos neste evento."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed">
            <strong>⚠️ Atenção:</strong> Você está prestes a remover todos os participantes inscritos neste evento.
            Esta operação é irreversível e liberará os bilhetes para novas inscrições ou novas importações.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsClearParticipantsModalOpen(false)}
              disabled={isClearingParticipants}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmClearAllParticipants}
              isLoading={isClearingParticipants}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Sim, Limpar Lista de Inscritos
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Cancel Draw */}
      <Modal
        isOpen={isCancelDrawModalOpen}
        onClose={() => !isCancellingDraw && setIsCancelDrawModalOpen(false)}
        title="Anular Sorteio e Devolver Prêmio"
        description="Esta ação cancelará o registro do sorteio selecionado e liberará o prêmio para um novo sorteio."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Atenção: Ação de Anulação</span>
            </div>
            <p className="leading-relaxed">
              O prêmio <strong>&quot;{drawToCancel?.prize?.name}&quot;</strong> voltará para o status <strong>DISPONÍVEL</strong> e poderá ser sorteado novamente na roleta do operador.
            </p>
            {drawToCancel?.winnerParticipant?.name && (
              <div className="font-bold text-rose-800">
                Ganhador desclassificado: #{padNumber(drawToCancel.drawnNumber || drawToCancel.winnerParticipant.ticketNumber, 3)} - {drawToCancel.winnerParticipant.name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Motivo da Anulação (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Ausente no auditório / Desclassificado por regulamento"
              value={cancelDrawReason}
              onChange={(e) => setCancelDrawReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cancelDrawMarkIneligible}
              onChange={(e) => setCancelDrawMarkIneligible(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800">Marcar este participante como Inelegível</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Impede que este mesmo participante seja sorteado novamente nas próximas rodadas deste evento.
              </p>
            </div>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsCancelDrawModalOpen(false)}
              disabled={isCancellingDraw}
            >
              Manter Sorteio
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleConfirmCancelDraw}
              isLoading={isCancellingDraw}
              leftIcon={<Undo2 className="w-4 h-4" />}
            >
              Sim, Anular e Devolver Prêmio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Share Winners */}
      {event && (
        <WinnerShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          eventName={event.name}
          eventDate={event.date}
          eventSlug={event.slug}
          eventId={event.id}
          winners={results}
        />
      )}
    </div>
  );
}
