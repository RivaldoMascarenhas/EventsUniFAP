"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { publicRegistrationSchema, PublicRegistrationInput } from "@/lib/validations";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Sparkles,
  Ticket,
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  User,
  Hash,
  Mail,
  Phone,
  GraduationCap,
  Copy,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatDate, formatDateTime, padNumber } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/branding/BrandLogo";

export default function PublicEventRegistrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { success, error, info } = useToast();

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredTicket, setRegisteredTicket] = useState<any>(null);
  const [countdown, setCountdown] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PublicRegistrationInput>({
    resolver: zodResolver(publicRegistrationSchema),
    defaultValues: {
      eventId: "",
      name: "",
      registration: "",
      email: "",
      phone: "",
      category: "",
    },
  });

  const loadEvent = useCallback(async () => {
    if (!slug) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/public/events/${slug}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const found = await res.json();
        setEvent(found);
        setValue("eventId", found.id);
      } else {
        setEvent(null);
      }
    } catch (err) {
      console.error(err);
      setEvent(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug, setValue]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const isRegistrationOpen = event?.registrationStatus?.isOpen ?? true;

  // Live Countdown effect if registration is scheduled for a future moment
  useEffect(() => {
    if (!event?.registrationStatus?.opensAt || isRegistrationOpen) return;

    const opensAtTime = new Date(event.registrationStatus.opensAt).getTime();

    const updateTimer = () => {
      const diff = opensAtTime - Date.now();
      if (diff <= 0) {
        setCountdown("Inscrições abrindo...");
        loadEvent();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCountdown(`${hours}h ${padNumber(mins, 2)}m ${padNumber(secs, 2)}s`);
      } else {
        setCountdown(`${padNumber(mins, 2)}m ${padNumber(secs, 2)}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event, isRegistrationOpen, loadEvent]);

  const onSubmit = async (data: PublicRegistrationInput) => {
    if (!event) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${event.id}/public-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erro ao realizar inscrição.");

      setRegisteredTicket(resData.participant);
      if (resData.alreadyRegistered) {
        info("Cadastro Localizado", `Você já está inscrito neste sorteio! Seu número é #${padNumber(resData.participant.ticketNumber, 3)}.`);
      } else {
        success("Inscrição Confirmada!", `Seu número da sorte é #${padNumber(resData.participant.ticketNumber, 3)}.`);
      }
    } catch (err: any) {
      error("Atenção", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTicket = () => {
    if (registeredTicket) {
      navigator.clipboard.writeText(String(registeredTicket.ticketNumber));
      info("Copiado!", "Número do bilhete copiado.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh-unifap flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-unifap-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold">Carregando evento UniFAP...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-mesh-unifap flex items-center justify-center p-4 text-white text-center">
        <div className="glass-panel-dark p-8 rounded-3xl max-w-md w-full border border-white/20">
          <h2 className="text-xl font-bold text-white mb-2">Evento Não Encontrado</h2>
          <p className="text-xs text-slate-300">
            Verifique o link ou QR Code escaneado e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh-unifap flex flex-col justify-between p-4 sm:p-6 selection:bg-unifap-gold selection:text-unifap-navy">
      {/* Top Header - Perfectly Centered & Stacked */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center pt-3 pb-5 gap-2.5">
        <BrandLogo variant="white" width={230} height={58} priority className="mx-auto" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-unifap-goldLight backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-unifap-gold" />
          <span>Inscrição Oficial para Sorteio</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col justify-center my-2">
        <AnimatePresence mode="wait">
          {!isRegistrationOpen ? (
            /* Registration NOT OPEN Yet - Countdown / Notice Screen */
            <motion.div
              key="closed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40 text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto shadow-sm">
                <Clock className="w-8 h-8 animate-pulse text-amber-600" />
              </div>

              <div>
                <Badge variant="gold" className="mb-2">Inscrições em Breve</Badge>
                <h1 className="text-xl font-extrabold text-unifap-navy">{event.name}</h1>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
                  {event.registrationStatus?.reason || "As inscrições para este evento ainda não foram abertas."}
                </p>
              </div>

              {countdown && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-inner">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-unifap-gold mb-1">
                    Abertura das Inscrições em
                  </div>
                  <div className="text-3xl sm:text-4xl font-mono font-black text-amber-400 tracking-wider">
                    {countdown}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2 text-slate-600">
                {event.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-unifap-navy" />
                    <span><strong>Data do Evento:</strong> {formatDate(event.date)} {event.time ? `às ${event.time}` : ""}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-unifap-navy" />
                    <span><strong>Local:</strong> {event.location}</span>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={loadEvent}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Atualizar Página
              </Button>
            </motion.div>
          ) : !registeredTicket ? (
            /* Registration Form */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40"
            >
              {/* Event Badge Info */}
              <div className="border-b border-slate-200/80 pb-4 mb-5 text-left">
                <h1 className="text-xl font-extrabold text-unifap-navy tracking-tight leading-tight">
                  {event.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-2">
                  {event.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-unifap-gold" />
                      {formatDate(event.date)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-unifap-light" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Anti-bot honeypot field (hidden from real users) */}
                <input
                  type="text"
                  name="_hp_unifap"
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden opacity-0 absolute -z-10"
                  aria-hidden="true"
                />

                <div>
                  <Label required>Nome Completo</Label>
                  <Input
                    placeholder="Seu nome completo"
                    leftIcon={<User className="w-4 h-4" />}
                    error={errors.name?.message}
                    {...register("name")}
                  />
                </div>

                <div>
                  <Label required>Matrícula ou CPF</Label>
                  <Input
                    placeholder="202310000 ou 000.000.000-00"
                    leftIcon={<Hash className="w-4 h-4" />}
                    error={errors.registration?.message}
                    {...register("registration")}
                  />
                </div>

                <div>
                  <Label required>Curso / Setor / Categoria</Label>
                  <Input
                    placeholder="Ex: Sistemas de Informação, Fisioterapia, Visitante..."
                    leftIcon={<GraduationCap className="w-4 h-4" />}
                    error={errors.category?.message}
                    {...register("category")}
                  />
                </div>

                {/* Optional Contact Fields */}
                <div className="pt-2 border-t border-slate-200/60 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Notificações de Premiação (Opcional)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        placeholder="seu.email@unifapce.edu.br"
                        leftIcon={<Mail className="w-4 h-4" />}
                        error={errors.email?.message}
                        {...register("email")}
                      />
                    </div>

                    <div>
                      <Label>Telefone / WhatsApp</Label>
                      <Input
                        placeholder="(88) 99999-9999"
                        leftIcon={<Phone className="w-4 h-4" />}
                        error={errors.phone?.message}
                        {...register("phone")}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="w-full text-base font-black shadow-lg shadow-amber-500/25"
                    isLoading={isSubmitting}
                  >
                    GERAR MEU NÚMERO DA SORTE
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Digital Lucky Ticket Confirmation Card */
            <motion.div
              key="ticket"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-unifap-gold text-center relative overflow-hidden"
            >
              {/* Top Glow Ribbon */}
              <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-unifap-navy via-unifap-gold to-unifap-navy" />

              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <Badge variant="gold" className="mb-2">Inscrição Validada</Badge>
              <h2 className="text-lg font-bold text-slate-800">Você está concorrendo!</h2>
              <p className="text-xs text-slate-500 mb-6">{registeredTicket.eventName}</p>

              {/* Big Lucky Ticket Number Box */}
              <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl mb-6 relative">
                <div className="text-[11px] uppercase font-bold tracking-widest text-unifap-gold mb-1">
                  Seu Número da Sorte
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono tracking-wider text-white">
                  #{padNumber(registeredTicket.ticketNumber, 3)}
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-2">
                  {registeredTicket.name}
                </div>
              </div>

              <div className="space-y-2">
                <Button variant="primary" size="md" className="w-full" onClick={copyTicket} leftIcon={<Copy className="w-4 h-4" />}>
                  Copiar Número do Bilhete
                </Button>
                <p className="text-[11px] text-slate-400">
                  Fique atento ao telão durante o evento! Boa sorte!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-blue-200/80 pt-4 flex items-center justify-center gap-1.5 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-unifap-gold" />
        <span>Centro Universitário Paraíso — UniFAP</span>
      </div>
    </div>
  );
}
