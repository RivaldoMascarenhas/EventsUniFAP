"use client";

import React, { useState, useEffect, useRef, use, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { soundEngine } from "@/lib/sound/soundEngine";
import { fireInstitutionalConfetti } from "@/components/ui/ConfettiEffect";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import QRCode from "qrcode";
import {
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Building2,
  QrCode,
  Users,
  Smartphone,
  CheckCircle,
  Wifi,
  WifiOff,
  Calendar,
  MapPin,
  ImageIcon,
} from "lucide-react";
import { padNumber, formatDate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type PresentationState = "IDLE" | "SHOWING_QR_CODE" | "SHOWING_EVENT_LOGO" | "SHOWING_PRIZE" | "DRAWING" | "RESULT";

function PresentationContent({ eventId }: { eventId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [event, setEvent] = useState<any>(null);
  const [state, setState] = useState<PresentationState>("IDLE");
  const stateRef = useRef<PresentationState>("IDLE");
  const [currentPrize, setCurrentPrize] = useState<any>(null);
  const [currentWinner, setCurrentWinner] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [participantCount, setParticipantCount] = useState<number>(0);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rollingNumber, setRollingNumber] = useState("000");
  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);

  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setSafeState = (newState: PresentationState) => {
    if (stateRef.current !== newState) {
      stateRef.current = newState;
      setState(newState);
    }
  };

  // Initial event data fetch
  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        setParticipantCount(data._count?.participants ?? data.participants?.length ?? 0);

        // Generate QR code for presentation
        const appUrl = typeof window !== "undefined" ? window.location.origin : "";
        const regUrl = `${appUrl}/public/event/${data.slug}`;
        const qr = await QRCode.toDataURL(regUrl, {
          width: 500,
          margin: 2,
          color: {
            dark: "#002B49",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const lastAnimatedDrawIdRef = useRef<string | null>(null);
  const isAnimatingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const audioFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Execute Ultra Fluid Suspense Rolling animation with Physics Deceleration Curve
  const startDrawRollAnimation = (winnerData: any) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    isAnimatingRef.current = true;

    setSafeState("DRAWING");
    if (winnerData?.prize) setCurrentPrize(winnerData.prize);
    soundEngine.play("DRAW_START");

    const targetNum = Number(winnerData?.drawnNumber ?? winnerData?.winner?.ticketNumber ?? 0);
    const minBound = winnerData?.minNumber ? Number(winnerData.minNumber) : 1;
    const maxBound = winnerData?.maxNumber ? Number(winnerData.maxNumber) : Math.max(targetNum, 100);
    const digits = maxBound > 99 ? 3 : 2;

    const startTime = performance.now();
    const duration = 2000; // 2.0s smooth suspense
    let lastTickTime = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth cubic deceleration (fast spin -> gentle slowdown -> click into place)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentTickInterval = 30 + easeProgress * 210;

      if (currentTime - lastTickTime >= currentTickInterval) {
        lastTickTime = currentTime;

        if (progress < 0.96) {
          const randomNum = Math.floor(Math.random() * (maxBound - minBound + 1)) + minBound;
          setRollingNumber(padNumber(randomNum, digits));

          if (easeProgress > 0.65) {
            soundEngine.play("DRAW_SLOWDOWN");
          } else {
            soundEngine.play("DRAW_TICK");
          }
        }
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        // Climax Reveal
        isAnimatingRef.current = false;
        setRollingNumber(padNumber(targetNum, digits));
        setCurrentWinner(winnerData);
        setSafeState("RESULT");

        soundEngine.play("DRAW_RESULT");
        setTimeout(() => {
          soundEngine.play("WINNER");
          fireInstitutionalConfetti();
        }, 120);
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);
  };

  // Central State Dispatcher for all realtime transports (Supabase Broadcast, SSE, Polling)
  const handleIncomingState = (payload: any, isInitialLoad = false) => {
    if (!payload || !payload.type) return;

    const drawKey = payload.drawId || payload.winner?.drawId || (payload.winner?.drawnNumber ? `num-${payload.winner.drawnNumber}-${payload.winner.prize?.id || ''}` : null);

    if (payload.type === "state:sync") {
      if (!isAnimatingRef.current) {
        if (payload.state) setSafeState(payload.state);
        if (payload.prize) setCurrentPrize(payload.prize);
        if (payload.winner) setCurrentWinner(payload.winner);
      }
    } else if (payload.type === "qr:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_QR_CODE");
    } else if (payload.type === "logo:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_EVENT_LOGO");
    } else if (payload.type === "idle:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      isAnimatingRef.current = false;
      setSafeState("IDLE");
      setCurrentWinner(null);
    } else if (payload.type === "prize:show") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      isAnimatingRef.current = false;
      setSafeState("SHOWING_PRIZE");
      if (payload.prize) setCurrentPrize(payload.prize);
      setCurrentWinner(null);
    } else if (payload.type === "draw:start") {
      if (isInitialLoad) {
        setSafeState("IDLE");
      } else if (!isAnimatingRef.current) {
        setSafeState("DRAWING");
        if (payload.prize) setCurrentPrize(payload.prize);
        soundEngine.play("DRAW_START");
      }
    } else if (payload.type === "draw:result") {
      if (payload.winner) {
        const isAlreadyProcessed = drawKey && lastAnimatedDrawIdRef.current === drawKey;
        if (drawKey) lastAnimatedDrawIdRef.current = drawKey;

        // If page is just loading, or already played this draw, show RESULT statically without spinning roulette
        if (isInitialLoad || isAlreadyProcessed) {
          if (!isAnimatingRef.current) {
            setCurrentWinner(payload.winner);
            if (payload.winner.prize || payload.prize) setCurrentPrize(payload.winner.prize || payload.prize);
            setSafeState("RESULT");
          }
        } else {
          startDrawRollAnimation(payload.winner);
        }
      }
    } else if (payload.type === "draw:cancel") {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      isAnimatingRef.current = false;
      setSafeState("IDLE");
      setCurrentWinner(null);
    } else if (payload.type === "audio:config") {
      if (typeof payload.soundEnabled === "boolean") {
        setSoundEnabled(payload.soundEnabled);
        soundEngine.setEnabled(payload.soundEnabled);

        if (!isInitialLoad) {
          if (audioFeedbackTimeoutRef.current) clearTimeout(audioFeedbackTimeoutRef.current);
          setAudioFeedback(payload.soundEnabled ? "Áudio dos Telões Ativado" : "Áudio dos Telões Silenciado pelo Operador");
          audioFeedbackTimeoutRef.current = setTimeout(() => {
            setAudioFeedback(null);
          }, 2500);
        }
      }
      if (typeof payload.volume === "number") {
        soundEngine.setVolume(payload.volume);
      }
    } else if (payload.type === "participant:registered") {
      if (typeof payload.participantCount === "number") {
        setParticipantCount(payload.participantCount);
      } else {
        setParticipantCount((prev) => prev + 1);
      }
    }

    // Auto-sync participant count if present in any broadcast payload
    if (typeof payload.participantCount === "number") {
      setParticipantCount(payload.participantCount);
    }

    // Auto-sync audio state if present in any broadcast payload
    if (typeof payload.soundEnabled === "boolean" && payload.type !== "audio:config") {
      setSoundEnabled(payload.soundEnabled);
      soundEngine.setEnabled(payload.soundEnabled);
    }
    if (typeof payload.volume === "number" && payload.type !== "audio:config") {
      soundEngine.setVolume(payload.volume);
    }
  };

  // 1. Primary: Supabase Realtime WebSocket Broadcast (Instant delivery on all devices)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase.channel(`presentation:${eventId}`);
    channel
      .on("broadcast", { event: "state_change" }, ({ payload }) => {
        setIsConnected(true);
        handleIncomingState(payload, false);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // 2. Secondary: Background Polling Sync (Runs every 2.5 seconds to guarantee mobile phones never desync)
  useEffect(() => {
    let isMounted = true;
    let isInitialSync = true;

    const syncState = async () => {
      // Never interrupt live 60fps rolling animation with network fetch
      if (isAnimatingRef.current) return;

      const isFirst = isInitialSync;

      try {
        const res = await fetch(`/api/events/${eventId}/realtime?poll=true${token ? `&token=${token}` : ""}`, {
          cache: "no-store",
        });
        if (res.ok && isMounted && !isAnimatingRef.current) {
          const payload = await res.json();
          setIsConnected(true);
          if (payload && payload.state) {
            handleIncomingState(payload, isFirst);
          }
        }
      } catch {
        // Fallback
      } finally {
        isInitialSync = false;
      }
    };

    syncState();
    const interval = setInterval(syncState, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [eventId, token]);

  // 3. Tertiary: Standard SSE Connection
  useEffect(() => {
    const sseUrl = `/api/events/${eventId}/realtime${token ? `?token=${token}` : ""}`;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          handleIncomingState(payload, false);
        } catch (err) {
          console.error("Error parsing SSE payload", err);
        }
      };

      eventSource.onerror = () => {
        // Handled gracefully by Supabase Realtime and Polling
      };
    } catch {
      // Ignore
    }

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
      if (eventSource) eventSource.close();
    };
  }, [eventId, token]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") toggleSound();
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="fixed inset-0 bg-mesh-presentation text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden font-sans">
      {/* Background Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-unifap-light/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-unifap-gold/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header: UniFAP Official Brand Logo & Status */}
      <header className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo variant="white" width={220} height={56} priority />
          <div className="hidden md:block h-8 w-[1px] bg-white/20" />
          <div className="hidden md:block">
            <h2 className="text-sm font-bold text-white tracking-wide">
              {event?.name || "Semana Acadêmica UniFAP 2026"}
            </h2>
            <p className="text-[11px] text-unifap-gold font-semibold uppercase tracking-wider">
              Centro Universitário Paraíso — UniFAP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Remote Feedback Pill */}
          {audioFeedback && (
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-lg transition-all duration-300">
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{audioFeedback}</span>
            </div>
          )}

          {/* Live Sync Status indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border ${
              isConnected
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                : "bg-rose-950/40 text-rose-300 border-rose-500/30"
            }`}
          >
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
            <span className="text-[11px]">{isConnected ? "Sincronizado" : "Reconectando..."}</span>
          </div>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition backdrop-blur-md ${
              soundEnabled
                ? "bg-white/10 hover:bg-white/20 border-white/15 text-white"
                : "bg-rose-950/50 border-rose-500/30 text-rose-300"
            }`}
            title={soundEnabled ? "Desativar Sons dos Telões (M)" : "Ativar Sons dos Telões (M)"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-unifap-gold" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition backdrop-blur-md"
            title="Alternar Tela Cheia (F)"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Center Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center my-auto text-center px-4">
        <AnimatePresence mode="wait">
          {/* STATE 1: IDLE */}
          {state === "IDLE" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-unifap-gold/20 border border-unifap-gold/40 text-unifap-gold text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
                <Sparkles className="w-4 h-4" />
                <span>Palco Oficial de Premiações</span>
              </div>

              <h1 className="text-4xl sm:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                Uni<span className="text-unifap-gold">FAP</span> Sorteios
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto font-light leading-relaxed">
                Aguardando o operador autorizar a próxima rodada de sorteio no palco.
              </p>

              <div className="pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Transmissão em tempo real ativa no auditório</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 2: SHOWING_EVENT_LOGO (PROJETAR LOGO DO EVENTO) */}
          {state === "SHOWING_EVENT_LOGO" && (
            <motion.div
              key="event-logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl w-full flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-unifap-gold text-slate-950 text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl">
                <Sparkles className="w-4 h-4" />
                <span>Evento Oficial UniFAP</span>
              </div>

              {/* Custom Logo / Emblem Presentation */}
              {event?.logoUrl || event?.coverUrl ? (
                <div className="p-4 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_60px_rgba(234,160,35,0.25)] max-w-lg mx-auto">
                  <img
                    src={event.logoUrl || event.coverUrl}
                    alt={event.name}
                    className="max-h-56 sm:max-h-72 w-auto object-contain mx-auto rounded-2xl"
                  />
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_60px_rgba(234,160,35,0.25)] flex flex-col items-center">
                  <BrandLogo variant="square-white" width={120} height={120} className="w-24 h-24 sm:w-32 sm:h-32 mb-4" />
                  <div className="text-xs uppercase tracking-widest text-unifap-gold font-bold">
                    Centro Universitário Paraíso
                  </div>
                </div>
              )}

              <div>
                <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                  {event?.name || "Semana Acadêmica UniFAP 2026"}
                </h1>
                {event?.description && (
                  <p className="text-sm sm:text-lg text-slate-300 font-light mt-3 max-w-2xl mx-auto leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Event Meta Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {event?.date && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200">
                    <Calendar className="w-4 h-4 text-unifap-gold" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                )}
                {event?.location && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 border border-white/15 text-xs sm:text-sm text-slate-200">
                    <MapPin className="w-4 h-4 text-unifap-light" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STATE 3: SHOWING_QR_CODE */}
          {state === "SHOWING_QR_CODE" && (
            <motion.div
              key="qrcode"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-4xl w-full flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-unifap-gold text-slate-950 text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg">
                <Smartphone className="w-4 h-4" />
                <span>Inscrições Abertas no Auditório</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-xl">
                  Escaneie o QR Code e Participe!
                </h1>
                <p className="text-sm sm:text-lg text-slate-300 font-light mt-2 max-w-2xl mx-auto">
                  Aponte a câmera do seu celular para cadastrar seu nome e gerar seu <strong className="text-unifap-gold">Número da Sorte</strong> oficial.
                </p>
              </div>

              {/* QR Code Card with Glow */}
              <div className="relative group p-4 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-xl border-2 border-unifap-gold/60 shadow-[0_0_50px_rgba(234,160,35,0.3)] flex flex-col items-center">
                {qrCodeDataUrl ? (
                  <div className="bg-white p-4 rounded-2xl shadow-2xl">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code Inscrição"
                      className="w-56 h-56 sm:w-72 sm:h-72 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-white/20 animate-pulse rounded-2xl flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-white/40" />
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/15 text-xs text-blue-200 font-mono">
                  <span>unifapce.edu.br • Evento Oficial</span>
                </div>
              </div>

              {/* Participants Counter badge */}
              <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-xs sm:text-sm text-slate-200 backdrop-blur-md shadow-xl transition-all">
                <Users className="w-4 h-4 text-unifap-gold" />
                <span>
                  <strong className="text-unifap-gold font-mono font-black text-sm sm:text-base">
                    {participantCount}
                  </strong>{" "}
                  {participantCount === 1 ? "participante já inscrito" : "participantes já inscritos"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
              </div>
            </motion.div>
          )}

          {/* STATE 4: SHOWING_PRIZE */}
          {state === "SHOWING_PRIZE" && currentPrize && (
            <motion.div
              key="prize"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-unifap-gold/20 border border-unifap-gold/40 text-unifap-gold text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
                <Trophy className="w-4 h-4" />
                <span>Próximo Prêmio</span>
              </div>

              {currentPrize.imageUrl ? (
                <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 max-w-md mx-auto shadow-2xl">
                  <img
                    src={currentPrize.imageUrl}
                    alt={currentPrize.name}
                    className="max-h-64 w-auto object-contain mx-auto rounded-2xl"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 mx-auto rounded-3xl bg-unifap-gold/20 border border-unifap-gold/30 flex items-center justify-center shadow-2xl backdrop-blur-md">
                  <Trophy className="w-16 h-16 text-unifap-gold" />
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">
                  Rodada #{currentPrize.order}
                </div>
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg">
                  {currentPrize.name}
                </h1>
                {currentPrize.description && (
                  <p className="text-slate-300 font-light mt-2 max-w-lg mx-auto">
                    {currentPrize.description}
                  </p>
                )}
              </div>

              {currentPrize.sponsor && (
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
                  {currentPrize.sponsor.logoUrl && (
                    <img
                      src={currentPrize.sponsor.logoUrl}
                      alt={currentPrize.sponsor.name}
                      className="h-7 w-auto object-contain"
                    />
                  )}
                  <span className="text-sm font-semibold text-slate-200">
                    Oferecido por: <strong className="text-unifap-gold">{currentPrize.sponsor.name}</strong>
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* STATE 5: DRAWING (ROULETTE SUSPENSE) */}
          {state === "DRAWING" && (
            <motion.div
              key="drawing"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-extrabold uppercase tracking-widest backdrop-blur-md animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span>Sorteando Agora...</span>
              </div>

              {/* Suspense Slot Number Reel */}
              <div className="relative p-8 sm:p-14 rounded-3xl bg-slate-950/80 border-2 border-unifap-gold/80 shadow-[0_0_80px_rgba(234,160,35,0.4)] backdrop-blur-2xl">
                <div className="text-8xl sm:text-[160px] font-black font-mono text-white tracking-widest drop-shadow-[0_10px_40px_rgba(234,160,35,0.8)] select-none leading-none">
                  #{rollingNumber}
                </div>
                <div className="absolute inset-0 rounded-3xl pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-black/40" />
              </div>

              {currentPrize && (
                <div className="text-lg font-bold text-slate-300">
                  Prêmio: <span className="text-white">{currentPrize.name}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STATE 6: RESULT */}
          {state === "RESULT" && currentWinner && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
              className="space-y-6 max-w-4xl w-full"
            >
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-unifap-gold text-unifap-dark text-sm sm:text-base font-black uppercase tracking-widest shadow-2xl">
                <Sparkles className="w-5 h-5 fill-current" />
                PARABÉNS AO CONTEMPLADO!
              </div>

              {/* Giant Number Reveal */}
              <div className="text-7xl sm:text-[140px] font-black font-mono text-white tracking-tight drop-shadow-[0_10px_50px_rgba(255,255,255,0.4)] leading-none">
                #{padNumber(currentWinner.drawnNumber, 3)}
              </div>

              {/* Winner Name Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/15 border-2 border-unifap-gold/80 backdrop-blur-xl shadow-2xl">
                <h2 className="text-3xl sm:text-5xl font-black text-unifap-gold tracking-tight">
                  {currentWinner.winner?.name || currentWinner.drawnName}
                </h2>
                {currentWinner.winner?.category && (
                  <p className="text-sm sm:text-base text-slate-200 font-semibold mt-2">
                    {currentWinner.winner.category} {currentWinner.winner.registration ? `• Matrícula: ${currentWinner.winner.registration}` : ""}
                  </p>
                )}
              </div>

              {/* Prize & Sponsor Showcase */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-200">
                <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                  Prêmio: <strong className="text-white">{currentWinner.prize?.name || "Premiação Oficial"}</strong>
                </div>
                <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
                  Patrocínio: <strong className="text-unifap-gold">{currentWinner.prize?.sponsor?.name || "UniFAP"}</strong>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Footer: Brand Watermark */}
      <footer className="relative z-20 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>UniFAP Sorteios • Sistema Auditado e Criptografado</span>
        </div>
        <div>
          Centro Universitário Paraíso — Juazeiro do Norte / CE
        </div>
      </footer>
    </div>
  );
}

export default function PresentationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-bold">Conectando ao Telão 4K...</div>}>
      <PresentationContent eventId={eventId} />
    </Suspense>
  );
}
