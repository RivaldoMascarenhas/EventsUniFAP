"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { LoadingState } from "@/components/layout/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { soundEngine } from "@/lib/sound/soundEngine";
import { fireInstitutionalConfetti } from "@/components/ui/ConfettiEffect";
import {
  Trophy,
  Users,
  Play,
  Tv,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertTriangle,
  Gift,
  Building2,
  Sliders,
  Hash,
  ImageIcon,
  Share2,
  Search,
  X,
  Undo2,
} from "lucide-react";
import { padNumber, formatDateTime } from "@/lib/utils";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { WinnerShareModal } from "@/components/events/WinnerShareModal";

export default function OperatorDrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const { success, error, info } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>("");
  const [drawType, setDrawType] = useState<"NUMBER" | "NAME" | "RANGE">("NUMBER");
  const [minRange, setMinRange] = useState<number>(1);
  const [maxRange, setMaxRange] = useState<number>(100);
  
  // Audio Controls: Separate local and remote (presentation screens) with localStorage persistence
  const [localSoundEnabled, setLocalSoundEnabled] = useState(true);
  const [telaoSoundEnabled, setTelaoSoundEnabled] = useState(true);
  const [telaoVolume, setTelaoVolume] = useState<number>(0.85);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Restore audio settings from localStorage
  useEffect(() => {
    try {
      const savedLocal = localStorage.getItem("unifap_operator_local_sound");
      if (savedLocal !== null) {
        const isLocal = savedLocal === "true";
        setLocalSoundEnabled(isLocal);
        soundEngine.setEnabled(isLocal);
      }

      const savedTelao = localStorage.getItem(`unifap_telao_sound_${eventId}`);
      if (savedTelao !== null) {
        setTelaoSoundEnabled(savedTelao === "true");
      }

      const savedVolume = localStorage.getItem(`unifap_telao_volume_${eventId}`);
      if (savedVolume !== null) {
        setTelaoVolume(parseFloat(savedVolume));
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, [eventId]);

  // Prize search filter
  const [prizeSearch, setPrizeSearch] = useState("");

  // Cancel Draw State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelMarkIneligible, setCancelMarkIneligible] = useState(false);
  const [isCancellingDraw, setIsCancellingDraw] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Animated rolling state for UI suspense
  const [rollingNumber, setRollingNumber] = useState<string>("000");
  const [rollingName, setRollingName] = useState<string>("Sorteando...");
  const [latestWinner, setLatestWinner] = useState<any>(null);
  const [presentationTokenUrl, setPresentationTokenUrl] = useState<string>("");

  const fetchEventData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [resEvent, resToken] = await Promise.all([
        fetch(`/api/events/${eventId}`, { cache: "no-store" }),
        fetch(`/api/events/${eventId}/presentation-token`, { cache: "no-store" }),
      ]);

      if (!resEvent.ok) throw new Error("Evento não encontrado");
      const data = await resEvent.json();
      setEvent(data);

      if (resToken.ok) {
        const tokenData = await resToken.json();
        setPresentationTokenUrl(tokenData.presentationUrl);
      }

      const availablePrizes = (data.prizes || []).filter((p: any) => p.status === "AVAILABLE");
      setPrizes(availablePrizes);
      if (availablePrizes.length > 0) {
        setSelectedPrizeId((prev) => {
          const isStillAvailable = availablePrizes.some((p: any) => p.id === prev);
          return isStillAvailable ? prev : availablePrizes[0].id;
        });
      } else {
        setSelectedPrizeId("");
      }
    } catch (err: any) {
      error("Erro", err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  // Audio Broadcast & Control
  const broadcastAudioConfig = async (enabled: boolean, vol: number = telaoVolume) => {
    setTelaoSoundEnabled(enabled);
    setTelaoVolume(vol);

    try {
      localStorage.setItem(`unifap_telao_sound_${eventId}`, String(enabled));
      localStorage.setItem(`unifap_telao_volume_${eventId}`, String(vol));
    } catch {}

    await broadcastRealtime({
      type: "audio:config",
      soundEnabled: enabled,
      volume: vol,
    });

    if (enabled) {
      success("Áudio Ativado nos Telões", `Volume transmitido em ${Math.round(vol * 100)}% para todas as telas.`);
    } else {
      info("Telões Silenciados", "Todas as telas e TVs conectadas foram colocadas no mudo.");
    }
  };

  const toggleTelaoAudio = () => {
    broadcastAudioConfig(!telaoSoundEnabled, telaoVolume);
  };

  const toggleLocalSound = () => {
    const next = !localSoundEnabled;
    setLocalSoundEnabled(next);
    soundEngine.setEnabled(next);
    try {
      localStorage.setItem("unifap_operator_local_sound", String(next));
    } catch {}
  };

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId);

  // Filter prizes by search term
  const filteredPrizes = prizes.filter((p) => {
    if (!prizeSearch.trim()) return true;
    const q = prizeSearch.toLowerCase().trim();
    const orderMatch = `#${p.order}`.toLowerCase().includes(q) || String(p.order) === q;
    const nameMatch = p.name?.toLowerCase().includes(q);
    const sponsorMatch = p.sponsor?.name?.toLowerCase().includes(q);
    const descMatch = p.description?.toLowerCase().includes(q);
    return Boolean(orderMatch || nameMatch || sponsorMatch || descMatch);
  });

  // Cancel latest draw and free prize back to AVAILABLE status
  const handleCancelLatestDraw = async () => {
    if (!latestWinner) return;
    const drawId = latestWinner.drawId || latestWinner.id;
    if (!drawId) {
      error("Erro", "Identificador do sorteio não encontrado.");
      return;
    }

    try {
      setIsCancellingDraw(true);
      const res = await fetch(`/api/events/${eventId}/draws/${drawId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || "Anulado pelo operador no palco",
          markIneligible: cancelMarkIneligible,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao anular sorteio");

      success(
        "Sorteio Anulado!",
        `O prêmio "${latestWinner.prize?.name || 'do sorteio'}" voltou a ficar DISPONÍVEL na roleta.`
      );

      setIsCancelModalOpen(false);
      setLatestWinner(null);
      setCancelReason("");
      setCancelMarkIneligible(false);

      // Re-fetch event data silently to update prizes and draws list
      await fetchEventData(true);
    } catch (err: any) {
      error("Erro ao anular", err.message);
    } finally {
      setIsCancellingDraw(false);
    }
  };

  // Calculate already drawn numbers in this event
  const alreadyDrawnNumbers: number[] = (event?.draws || [])
    .filter((d: any) => d.status === "COMPLETED" && typeof d.drawnNumber === "number")
    .map((d: any) => d.drawnNumber);

  const drawnInRange = alreadyDrawnNumbers.filter((n) => n >= minRange && n <= maxRange);
  const totalInRange = Math.max(0, maxRange - minRange + 1);
  const remainingInRange = Math.max(0, totalInRange - drawnInRange.length);

  const supabaseChannelRef = useRef<any>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const ch = supabase.channel(`presentation:${eventId}`);
    ch.subscribe();
    supabaseChannelRef.current = ch;

    return () => {
      if (supabase && ch) {
        supabase.removeChannel(ch);
      }
    };
  }, [eventId]);

  // Broadcast helper using Supabase Realtime WebSocket (Instant) + API (Persistent)
  const broadcastRealtime = async (payload: any) => {
    const enrichedPayload = {
      ...payload,
      timestamp: Date.now(),
    };

    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: "broadcast",
        event: "state_change",
        payload: enrichedPayload,
      }).catch(() => {});
    }

    try {
      await fetch(`/api/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedPayload),
      });
    } catch {
      // Graceful fallback
    }
  };

  // Broadcast prize selection to realtime presentation
  const handleSelectPrize = async (prize: any) => {
    setSelectedPrizeId(prize.id);
    await broadcastRealtime({
      type: "prize:show",
      state: "SHOWING_PRIZE",
      prizeId: prize.id,
      prize,
    });
    info("Telão Atualizado", `Apresentando prêmio: ${prize.name}`);
  };

  // Broadcast QR Code to presentation screen
  const handleShowQrCode = async () => {
    await broadcastRealtime({
      type: "qr:show",
      state: "SHOWING_QR_CODE",
    });
    success("Telão 4K", "QR Code de inscrição projetado no telão!");
  };

  // Broadcast Event Logo / Emblem to presentation screen
  const handleShowEventLogo = async () => {
    await broadcastRealtime({
      type: "logo:show",
      state: "SHOWING_EVENT_LOGO",
    });
    success("Telão 4K", "Identidade Visual e Logo do Evento projetadas no telão!");
  };

  // Broadcast Idle splash screen
  const handleShowIdle = async () => {
    await broadcastRealtime({
      type: "idle:show",
      state: "IDLE",
    });
    info("Telão 4K", "Tela de espera institucional ativada.");
  };

  const handleStartDraw = () => {
    if (!selectedPrizeId) {
      error("Atenção", "Selecione um prêmio disponível para sortear.");
      return;
    }
    if (drawType === "RANGE" && remainingInRange <= 0) {
      error("Atenção", `Todos os números no intervalo de ${minRange} a ${maxRange} já foram sorteados neste evento!`);
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const executeConfirmedDraw = async () => {
    setIsConfirmModalOpen(false);
    setIsDrawing(true);
    setLatestWinner(null);

    // 1. Play Start Sound
    soundEngine.play("DRAW_START");

    // 2. Broadcast drawing state to Telão in realtime
    await broadcastRealtime({
      type: "draw:start",
      state: "DRAWING",
      prizeId: selectedPrizeId,
      prize: selectedPrize,
    });

    // 3. Generate unique Idempotency Key
    const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `draw-${Date.now()}`;

    // 4. Call server-side draw endpoint with Idempotency Key and Range values
    let drawResult: any = null;
    let apiError: string | null = null;

    try {
      const res = await fetch(`/api/events/${eventId}/draw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          prizeId: selectedPrizeId,
          drawType,
          minNumber: minRange,
          maxNumber: maxRange,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        apiError = data.error || "Falha na execução do sorteio.";
      } else {
        drawResult = data;
        // Broadcast result immediately to phone/projector screens
        await broadcastRealtime({
          type: "draw:result",
          state: "RESULT",
          winner: drawResult,
          prize: drawResult.prize,
        });
      }
    } catch (err: any) {
      apiError = err.message || "Erro de conexão ao executar sorteio.";
    }

    if (apiError) {
      setIsDrawing(false);
      error("Falha no Sorteio", apiError);
      return;
    }

    // 5. Ultra Fluid Progressive Suspense Animation (60FPS Physics Deceleration)
    const digits = drawType === "RANGE" && maxRange <= 99 ? 2 : 3;
    const startTime = performance.now();
    const duration = 2000;
    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Cubic deceleration curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentTickInterval = 30 + easeProgress * 210;

      if (currentTime - lastTickTime >= currentTickInterval) {
        lastTickTime = currentTime;

        if (progress < 0.96) {
          const randomFakeNum =
            drawType === "RANGE"
              ? Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange
              : Math.floor(Math.random() * 900) + 100;

          setRollingNumber(padNumber(randomFakeNum, digits));
          setRollingName(drawResult?.winner?.name || "Sorteando...");

          if (easeProgress > 0.65) {
            soundEngine.play("DRAW_SLOWDOWN");
          } else {
            soundEngine.play("DRAW_TICK");
          }
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 6. Reveal Final Winner
        setRollingNumber(padNumber(drawResult.drawnNumber, digits));
        setRollingName(drawResult.drawnName);
        setLatestWinner(drawResult);
        setIsDrawing(false);

        // 7. Climax Audio & Visual Fanfare
        soundEngine.play("DRAW_RESULT");
        setTimeout(() => {
          soundEngine.play("WINNER");
          fireInstitutionalConfetti();
          success("Sorteio Concluído!", `Número Sorteado: #${drawResult.drawnNumber}`);
        }, 120);

        fetchEventData(true);
      }
    };

    requestAnimationFrame(animate);
  };

  if (isLoading) return <LoadingState message="Carregando painel de sorteio..." />;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Eventos", href: "/admin/events" },
          { label: event.name, href: `/admin/events/${event.id}` },
          { label: "Console do Operador" },
        ]}
        title="Console de Operação do Sorteio"
        subtitle={`Operação em tempo real para ${event.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="gold"
              size="md"
              onClick={() => {
                fetchEventData(true);
                setIsShareModalOpen(true);
              }}
              leftIcon={<Share2 className="w-4 h-4 text-slate-950" />}
            >
              Divulgar Ganhadores
            </Button>

            <Link href={presentationTokenUrl || `/presentation/${event.id}`} target="_blank">
              <Button variant="primary" size="md" leftIcon={<Tv className="w-4 h-4" />}>
                Abrir Telão 4K
              </Button>
            </Link>
          </div>
        }
      />

      {/* Dedicated Operator Control Bar: Audio & Projection */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left: Remote Audio Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[11px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Tv className="w-3.5 h-3.5 text-unifap-navy" />
            <span>Áudio dos Telões:</span>
          </div>

          <button
            onClick={toggleTelaoAudio}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
              telaoSoundEnabled
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20"
                : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
            }`}
            title={
              telaoSoundEnabled
                ? "Áudio do Telão Ativado — Clique para Silenciar todas as TVs"
                : "Telões Silenciados — Clique para Ativar Áudio nas TVs"
            }
          >
            {telaoSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{telaoSoundEnabled ? "Áudio Ligado" : "Mudo (Silenciado)"}</span>
          </button>

          <button
            onClick={() => setIsAudioModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            title="Ajustar Volume e Múltiplas TVs"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Ajustes de Áudio</span>
          </button>
        </div>

        {/* Right: Presentation Projections */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[11px] font-bold uppercase text-slate-400 mr-1">Projetar no Telão:</div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowEventLogo}
            leftIcon={<ImageIcon className="w-3.5 h-3.5 text-unifap-light" />}
          >
            Logo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShowQrCode}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-unifap-gold" />}
          >
            QR Code
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShowIdle}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Tela Inicial
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuração da Rodada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Prize Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase text-slate-600">
                  1. Selecione o Prêmio
                </label>
                {prizes.length > 0 && (
                  <span className="text-[11px] font-bold text-slate-400">
                    {filteredPrizes.length} de {prizes.length} disp.
                  </span>
                )}
              </div>

              {prizes.length > 3 && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={prizeSearch}
                    onChange={(e) => setPrizeSearch(e.target.value)}
                    placeholder="Buscar prêmio, patrocinador ou #..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
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
              )}

              {prizes.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium text-center">
                  🏆 Todos os prêmios deste evento já foram sorteados!
                </div>
              ) : filteredPrizes.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center space-y-1.5">
                  <div>Nenhum prêmio encontrado para <strong>&quot;{prizeSearch}&quot;</strong>.</div>
                  <button
                    type="button"
                    onClick={() => setPrizeSearch("")}
                    className="text-xs font-bold text-unifap-navy hover:underline"
                  >
                    Limpar busca
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {filteredPrizes.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => !isDrawing && handleSelectPrize(p)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        selectedPrizeId === p.id
                          ? "bg-unifap-navy text-white border-unifap-navy shadow-md"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate">#{p.order} • {p.name}</div>
                        <div className={`text-[10px] mt-0.5 ${selectedPrizeId === p.id ? "text-amber-300" : "text-slate-500"}`}>
                          Patrocínio: {p.sponsor?.name || "UniFAP"}
                        </div>
                      </div>
                      <Badge variant={selectedPrizeId === p.id ? "gold" : "outline"}>
                        Disp.
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Draw Mode Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                2. Modo de Sorteio
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDrawType("NUMBER")}
                  disabled={isDrawing}
                  className={`p-2.5 rounded-xl text-center border transition ${
                    drawType === "NUMBER"
                      ? "bg-unifap-navy text-white border-unifap-navy font-bold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-[11px] font-bold">Nº Inscrito</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawType("NAME")}
                  disabled={isDrawing}
                  className={`p-2.5 rounded-xl text-center border transition ${
                    drawType === "NAME"
                      ? "bg-unifap-navy text-white border-unifap-navy font-bold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-[11px] font-bold">Por Nome</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawType("RANGE")}
                  disabled={isDrawing}
                  className={`p-2.5 rounded-xl text-center border transition ${
                    drawType === "RANGE"
                      ? "bg-unifap-gold text-slate-950 border-amber-500 font-extrabold shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-[11px] font-bold">Intervalo</div>
                </button>
              </div>
            </div>

            {/* Range Configuration Panel */}
            {drawType === "RANGE" && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-unifap-gold" />
                    <span>Intervalo Numérico (Sem Repetição)</span>
                  </div>
                  <Badge variant="gold">
                    {remainingInRange} de {totalInRange} disponíveis
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-amber-950 font-bold">De (Mínimo)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={minRange}
                      onChange={(e) => setMinRange(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isDrawing}
                      className="bg-white text-center font-mono font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-amber-950 font-bold">Até (Máximo)</Label>
                    <Input
                      type="number"
                      min={minRange}
                      value={maxRange}
                      onChange={(e) => setMaxRange(Math.max(minRange, parseInt(e.target.value) || minRange))}
                      disabled={isDrawing}
                      className="bg-white text-center font-mono font-bold"
                    />
                  </div>
                </div>

                {drawnInRange.length > 0 && (
                  <div className="pt-2 border-t border-amber-500/20">
                    <div className="text-[10px] font-bold uppercase text-amber-800 mb-1.5">
                      Já Sorteados neste intervalo ({drawnInRange.length}):
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {drawnInRange.map((num) => (
                        <span
                          key={num}
                          className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-mono font-bold"
                        >
                          #{num}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trigger Button */}
            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="gold"
                size="xl"
                className="w-full text-base font-black shadow-lg shadow-amber-500/25"
                disabled={prizes.length === 0 || isDrawing || (drawType === "RANGE" && remainingInRange <= 0)}
                isLoading={isDrawing}
                onClick={handleStartDraw}
                leftIcon={<Play className="w-5 h-5 fill-current" />}
              >
                {isDrawing ? "SORTEANDO..." : "EXECUTAR SORTEIO"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Live Stage Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-unifap-darker to-unifap-navy text-white border-none shadow-2xl overflow-hidden relative min-h-[380px] flex flex-col justify-between">
            {/* Background Glow */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-unifap-light/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar inside Card */}
            <div className="p-6 flex items-center justify-between border-b border-white/10 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200">
                  Palco de Sorteio Sincronizado
                </span>
              </div>
              {selectedPrize && (
                <div className="text-xs font-semibold text-unifap-gold">
                  Prêmio: {selectedPrize.name}
                </div>
              )}
            </div>

            {/* Center Slot Rolling Animation */}
            <div className="p-8 my-auto text-center relative z-10">
              {isDrawing ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.95, 1.05, 0.95] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                  className="space-y-2"
                >
                  <div className="text-6xl sm:text-8xl font-black font-mono tracking-wider text-unifap-goldLight drop-shadow-2xl">
                    {rollingNumber}
                  </div>
                  <div className="text-sm font-semibold text-blue-200 animate-pulse">
                    {drawType === "RANGE"
                      ? `Sorteando número no intervalo ${minRange} a ${maxRange}...`
                      : "Executando seleção no servidor..."}
                  </div>
                </motion.div>
              ) : latestWinner ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="space-y-4"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-unifap-gold text-unifap-dark font-extrabold text-xs uppercase tracking-wider shadow-lg">
                    <Sparkles className="w-4 h-4 fill-current" />
                    TEMOS UM CONTEMPLADO!
                  </div>

                  <div className="text-6xl sm:text-7xl font-black font-mono text-white tracking-tight drop-shadow-md">
                    #{padNumber(latestWinner.drawnNumber, 3)}
                  </div>

                  <div className="text-2xl sm:text-3xl font-extrabold text-unifap-gold">
                    {latestWinner.winner.name}
                  </div>

                  {latestWinner.winner.category && (
                    <div className="text-xs text-blue-200 font-medium">
                      {latestWinner.winner.category} {latestWinner.winner.registration ? `• Matrícula: ${latestWinner.winner.registration}` : ""}
                    </div>
                  )}

                  {/* Cancel / Invalidate Draw Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30 text-xs font-bold transition shadow-sm"
                      title="Anular este sorteio e devolver o prêmio à lista de prêmios disponíveis para ser sorteado novamente"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Anular Sorteio (Liberar Prêmio)</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl sm:text-7xl font-black font-mono text-white/30 tracking-wider">
                    ---
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {drawType === "RANGE"
                      ? `Modo Intervalo ativo: sorteio de ${minRange} a ${maxRange} (${remainingInRange} restantes).`
                      : "Selecione o prêmio e clique em 'EXECUTAR SORTEIO' para iniciar."}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Sponsor Ribbon */}
            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 relative z-10">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-unifap-gold" />
                <span>Patrocinador: <strong>{selectedPrize?.sponsor?.name || "UniFAP"}</strong></span>
              </div>
              <div className="text-[11px] text-slate-400">
                Sorteador Oficial UniFAP
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirmar Execução do Sorteio"
        description="Esta ação selecionará um vencedor criptograficamente e transmitirá o resultado ao telão em tempo real."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Dados da Rodada:</span>
            </div>
            <div><strong>Prêmio:</strong> {selectedPrize?.name}</div>
            <div><strong>Patrocínio:</strong> {selectedPrize?.sponsor?.name || "UniFAP"}</div>
            <div>
              <strong>Modo:</strong>{" "}
              {drawType === "RANGE"
                ? `Intervalo Simples (${minRange} a ${maxRange}) • ${remainingInRange} restantes`
                : drawType === "NUMBER"
                ? "Número da Sorte (Inscritos)"
                : "Nome do Participante (Inscritos)"}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="gold" onClick={executeConfirmedDraw} leftIcon={<Sparkles className="w-4 h-4" />}>
              Confirmar e Sortear
            </Button>
          </div>
        </div>
      </Modal>

      {/* Audio Multi-Screen Settings Modal */}
      <Modal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        title="Controle de Áudio dos Telões & Múltiplas TVs"
        description="Controle o áudio das TVs e projetores conectados em tempo real para evitar atrasos ou ecos no auditório."
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Tip Banner */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-unifap-navy">
              <Sparkles className="w-4 h-4 text-unifap-gold" />
              <span>Dica de Ouro para Eventos com Múltiplas TVs:</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              Ao usar múltiplos projetores ou TVs na mesma sala, os diferentes navegadores podem ter pequenos milissegundos de diferença no processamento, gerando eco.
              Para uma experiência profissional de auditório, silencie os telões remotos e plugue a saída de som da mesa do operador diretamente na caixa de som / PA principal.
            </p>
          </div>

          {/* Remote Telão Sound Setting */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-unifap-navy" />
                  <span>Áudio Remoto dos Telões (TVs e Projetores)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Controla o sintetizador de som em todas as telas abertas em tempo real.
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTelaoAudio}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  telaoSoundEnabled
                    ? "bg-amber-500 text-slate-950 shadow-sm font-black"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold"
                }`}
              >
                {telaoSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{telaoSoundEnabled ? "LIGADO" : "MUDO"}</span>
              </button>
            </div>

            {/* Telão Volume Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Volume dos Telões</span>
                <span className="font-mono font-bold text-unifap-navy">{Math.round(telaoVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={telaoVolume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  broadcastAudioConfig(val > 0 ? true : false, val);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-unifap-navy"
              />
            </div>
          </div>

          {/* Local Operator Sound Setting */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>Áudio Local (Neste Computador do Operador)</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ouvir os efeitos sonoros de roleta e vitória no notebook da operação.
              </div>
            </div>
            <button
              type="button"
              onClick={toggleLocalSound}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                localSoundEnabled
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold"
              }`}
            >
              {localSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{localSoundEnabled ? "LIGADO" : "MUDO"}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold uppercase text-slate-400">Atalhos Rápidos:</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  broadcastAudioConfig(false, 0);
                  setLocalSoundEnabled(true);
                  soundEngine.setEnabled(true);
                }}
                leftIcon={<VolumeX className="w-3.5 h-3.5 text-rose-500" />}
              >
                Mudo nos Telões + Som no Operador (Auditório)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  broadcastAudioConfig(true, 0.85);
                  setLocalSoundEnabled(false);
                  soundEngine.setEnabled(false);
                }}
                leftIcon={<Volume2 className="w-3.5 h-3.5 text-amber-500" />}
              >
                Som nos Telões + Mudo no Operador
              </Button>
            </div>
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
          winners={event.draws || []}
        />
      )}

      {/* Modal: Confirm Cancel Draw */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancellingDraw && setIsCancelModalOpen(false)}
        title="Anular Sorteio e Devolver Prêmio"
        description="Esta ação cancelará o sorteio atual e retornará o prêmio imediatamente para o status Disponível na roleta."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Atenção: Ação de Anulação</span>
            </div>
            <p className="leading-relaxed">
              O prêmio <strong>&quot;{latestWinner?.prize?.name}&quot;</strong> será devolvido à lista de prêmios disponíveis e poderá ser sorteado novamente para outro participante.
            </p>
            {latestWinner?.winner?.name && (
              <div className="font-bold text-rose-800">
                Ganhador a ser desclassificado: #{padNumber(latestWinner?.drawnNumber, 3)} - {latestWinner?.winner?.name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Motivo da Anulação (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Participante ausente no auditório / Desclassificado por regras"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cancelMarkIneligible}
              onChange={(e) => setCancelMarkIneligible(e.target.checked)}
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
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancellingDraw}
            >
              Manter Sorteio
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleCancelLatestDraw}
              isLoading={isCancellingDraw}
              leftIcon={<Undo2 className="w-4 h-4" />}
            >
              Sim, Anular e Devolver Prêmio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
