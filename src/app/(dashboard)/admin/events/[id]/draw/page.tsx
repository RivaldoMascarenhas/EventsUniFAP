"use client";

import React, { useState, useEffect, use } from "react";
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
} from "lucide-react";
import { padNumber, formatDateTime } from "@/lib/utils";
import { motion } from "framer-motion";

export default function OperatorDrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const { success, error, info } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>("");
  const [drawType, setDrawType] = useState<"NUMBER" | "NAME" | "RANGE">("NUMBER");
  const [minRange, setMinRange] = useState<number>(1);
  const [maxRange, setMaxRange] = useState<number>(100);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Animated rolling state for UI suspense
  const [rollingNumber, setRollingNumber] = useState<string>("000");
  const [rollingName, setRollingName] = useState<string>("Sorteando...");
  const [latestWinner, setLatestWinner] = useState<any>(null);
  const [presentationTokenUrl, setPresentationTokenUrl] = useState<string>("");

  const fetchEventData = async () => {
    try {
      setIsLoading(true);
      const [resEvent, resToken] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/presentation-token`),
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
      if (availablePrizes.length > 0 && !selectedPrizeId) {
        setSelectedPrizeId(availablePrizes[0].id);
      }
    } catch (err: any) {
      error("Erro", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
  };

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId);

  // Calculate already drawn numbers in this event
  const alreadyDrawnNumbers: number[] = (event?.draws || [])
    .filter((d: any) => d.status === "COMPLETED" && typeof d.drawnNumber === "number")
    .map((d: any) => d.drawnNumber);

  const drawnInRange = alreadyDrawnNumbers.filter((n) => n >= minRange && n <= maxRange);
  const totalInRange = Math.max(0, maxRange - minRange + 1);
  const remainingInRange = Math.max(0, totalInRange - drawnInRange.length);

  // Broadcast prize selection to realtime presentation
  const handleSelectPrize = async (prize: any) => {
    setSelectedPrizeId(prize.id);
    try {
      await fetch(`/api/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "prize:show",
          state: "SHOWING_PRIZE",
          prizeId: prize.id,
          prize,
        }),
      });
      info("Telão Atualizado", `Apresentando prêmio: ${prize.name}`);
    } catch {
      // Realtime broadcast graceful failure
    }
  };

  // Broadcast QR Code to presentation screen
  const handleShowQrCode = async () => {
    try {
      await fetch(`/api/events/${eventId}/realtime`, {
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
  };

  // Broadcast Event Logo / Emblem to presentation screen
  const handleShowEventLogo = async () => {
    try {
      await fetch(`/api/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "logo:show",
          state: "SHOWING_EVENT_LOGO",
        }),
      });
      success("Telão 4K", "Identidade Visual e Logo do Evento projetadas no telão!");
    } catch {
      error("Erro", "Falha ao enviar comando para o telão.");
    }
  };

  // Broadcast Idle splash screen
  const handleShowIdle = async () => {
    try {
      await fetch(`/api/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "idle:show",
          state: "IDLE",
        }),
      });
      info("Telão 4K", "Tela de espera institucional ativada.");
    } catch {
      error("Erro", "Falha ao enviar comando para o telão.");
    }
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
    try {
      await fetch(`/api/events/${eventId}/realtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "draw:start",
          state: "DRAWING",
          prizeId: selectedPrizeId,
          prize: selectedPrize,
        }),
      });
    } catch (e) {
      console.error(e);
    }

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
      }
    } catch (err: any) {
      apiError = err.message || "Erro de conexão ao executar sorteio.";
    }

    if (apiError) {
      setIsDrawing(false);
      error("Falha no Sorteio", apiError);
      return;
    }

    // 5. Progressive Suspense Animation
    let speed = 40;
    let iterations = 0;
    const maxIterations = 35;

    const interval = setInterval(() => {
      iterations++;
      const randomFakeNum =
        drawType === "RANGE"
          ? Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange
          : Math.floor(Math.random() * 900) + 100;

      setRollingNumber(padNumber(randomFakeNum, 3));
      setRollingName(drawResult?.winner?.name || "Sorteando...");

      if (iterations % 4 === 0) {
        soundEngine.play("DRAW_TICK");
      }

      if (iterations > 20) {
        speed += 30;
        soundEngine.play("DRAW_SLOWDOWN");
      }

      if (iterations >= maxIterations) {
        clearInterval(interval);

        // 6. Reveal Final Winner
        setRollingNumber(padNumber(drawResult.drawnNumber, 3));
        setRollingName(drawResult.drawnName);
        setLatestWinner(drawResult);
        setIsDrawing(false);

        // 7. Climax Audio & Visual Fanfare
        soundEngine.play("DRAW_RESULT");
        setTimeout(() => {
          soundEngine.play("WINNER");
          fireInstitutionalConfetti();
          success("Sorteio Concluído!", `Número Sorteado: #${drawResult.drawnNumber}`);
        }, 200);

        fetchEventData();
      }
    }, speed);
  };

  if (isLoading) return <LoadingState message="Carregando painel de sorteio..." />;

  return (
    <div className="space-y-6">
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
            <button
              onClick={toggleSound}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-bold ${
                soundEnabled
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                  : "bg-slate-100 border-slate-200 text-slate-400"
              }`}
              title={soundEnabled ? "Sons Ativados" : "Sons Desativados"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? "Áudio Ligado" : "Mudo"}</span>
            </button>

            <Button
              variant="outline"
              size="md"
              onClick={handleShowEventLogo}
              leftIcon={<ImageIcon className="w-4 h-4 text-unifap-light" />}
            >
              Projetar Logo do Evento
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleShowQrCode}
              leftIcon={<Sparkles className="w-4 h-4 text-unifap-gold" />}
            >
              Projetar QR Code
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={handleShowIdle}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Tela Inicial
            </Button>

            <Link href={presentationTokenUrl || `/presentation/${event.id}`} target="_blank">
              <Button variant="primary" size="md" leftIcon={<Tv className="w-4 h-4" />}>
                Abrir Telão 4K
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuração da Rodada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Prize Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                1. Selecione o Prêmio
              </label>
              {prizes.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                  Todos os prêmios deste evento já foram sorteados!
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {prizes.map((p) => (
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
    </div>
  );
}
