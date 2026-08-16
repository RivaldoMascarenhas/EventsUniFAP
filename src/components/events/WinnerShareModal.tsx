"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Share2,
  Copy,
  Download,
  CheckCircle2,
  Trophy,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  Printer,
  Calendar,
  Gift,
} from "lucide-react";
import { formatDate, formatDateTime, padNumber } from "@/lib/utils";

interface WinnerItem {
  id?: string;
  drawnNumber?: number;
  drawnName?: string;
  timestamp?: string | Date;
  winnerParticipant?: {
    name: string;
    ticketNumber: number;
    registration?: string | null;
    category?: string | null;
  };
  prize?: {
    name: string;
    description?: string | null;
    sponsor?: {
      name: string;
    } | null;
  };
}

interface WinnerShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  eventDate?: Date | string | null;
  eventSlug?: string;
  eventId?: string;
  winners: WinnerItem[];
}

export function WinnerShareModal({
  isOpen,
  onClose,
  eventName,
  eventDate,
  eventSlug,
  eventId,
  winners,
}: WinnerShareModalProps) {
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<"whatsapp" | "visual" | "exports">("whatsapp");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate WhatsApp Text
  const generateWhatsAppText = () => {
    let text = `🎓 *CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP*\n`;
    text += `🏆 *RESULTADOS OFICIAIS DOS SORTEIOS*\n`;
    text += `📌 *Evento:* ${eventName}\n`;
    if (eventDate) {
      text += `📅 *Data:* ${formatDate(eventDate)}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🎁 *RELAÇÃO DOS GANHADORES:*\n\n`;

    if (winners.length === 0) {
      text += `Nenhum sorteio foi realizado ainda para este evento.\n\n`;
    } else {
      winners.forEach((w, idx) => {
        const num = padNumber(w.drawnNumber || w.winnerParticipant?.ticketNumber || idx + 1, 3);
        const name = w.winnerParticipant?.name || w.drawnName || "Participante";
        const prize = w.prize?.name || "Prêmio";
        const sponsor = w.prize?.sponsor?.name;

        text += `⭐ *Bilhete #${num}* — ${name}\n`;
        text += `📦 *Prêmio:* ${prize}\n`;
        if (sponsor) {
          text += `🤝 *Parceria:* ${sponsor}\n`;
        }
        text += `\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ *Parabéns a todos os contemplados!*\n`;
    text += `🏛️ _Sistema Institucional UniFAP Sorteios_`;

    return text;
  };

  const whatsAppText = generateWhatsAppText();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsAppText);
    success("Copiado com Sucesso!", "Texto formatado pronto para colar no WhatsApp ou Telegram.");
  };

  // Draw High-Resolution Banner on Canvas & Download as PNG
  const downloadCardImage = () => {
    setIsGeneratingImage(true);
    try {
      const width = 1080;
      const rowHeight = 76;
      const headerHeight = 320;
      const footerHeight = 120;
      const listCount = Math.max(winners.length, 1);
      const height = headerHeight + listCount * rowHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      // 1. Background (UniFAP Navy Gradient)
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#001B2E");
      bgGrad.addColorStop(0.5, "#002B49");
      bgGrad.addColorStop(1, "#001524");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Gold Border Accent
      ctx.strokeStyle = "#EAA023";
      ctx.lineWidth = 12;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 2. Header
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CENTRO UNIVERSITÁRIO PARAÍSO — UNIFAP", width / 2, 80);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 46px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("🏆 RESULTADOS OFICIAIS", width / 2, 140);

      ctx.fillStyle = "#E2E8F0";
      ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(eventName, width / 2, 195);

      if (eventDate) {
        ctx.fillStyle = "#94A3B8";
        ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(`Realizado em ${formatDate(eventDate)}`, width / 2, 230);
      }

      // Divider line
      ctx.strokeStyle = "rgba(234, 160, 35, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 270);
      ctx.lineTo(width - 80, 270);
      ctx.stroke();

      // 3. Winners List
      let startY = 320;
      if (winners.length === 0) {
        ctx.fillStyle = "#94A3B8";
        ctx.font = "italic 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText("Nenhum sorteio registrado ainda para este evento.", width / 2, startY + 40);
      } else {
        winners.forEach((w, i) => {
          const y = startY + i * rowHeight;

          // Row card background
          ctx.fillStyle = i % 2 === 0 ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)";
          ctx.beginPath();
          ctx.roundRect(80, y, width - 160, 64, 14);
          ctx.fill();

          // Ticket Badge
          const ticketNum = padNumber(w.drawnNumber || w.winnerParticipant?.ticketNumber || i + 1, 3);
          ctx.fillStyle = "#EAA023";
          ctx.beginPath();
          ctx.roundRect(96, y + 10, 100, 44, 10);
          ctx.fill();

          ctx.fillStyle = "#001B2E";
          ctx.font = "900 22px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`#${ticketNum}`, 146, y + 40);

          // Winner Name
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "left";
          const winnerName = w.winnerParticipant?.name || w.drawnName || "Participante";
          ctx.fillText(winnerName, 215, y + 40);

          // Prize Name (Right aligned)
          ctx.fillStyle = "#FDE68A";
          ctx.font = "600 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "right";
          const prizeName = w.prize?.name || "Prêmio";
          const displayPrize = prizeName.length > 34 ? prizeName.substring(0, 32) + "..." : prizeName;
          ctx.fillText(`🎁 ${displayPrize}`, width - 106, y + 40);
        });
      }

      // 4. Footer
      const footerY = height - 60;
      ctx.fillStyle = "#EAA023";
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✨ Parabéns aos ganhadores! • unifapce.edu.br", width / 2, footerY);

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ganhadores-${eventSlug || "unifap"}.png`;
      link.href = dataUrl;
      link.click();

      success("Imagem Baixada!", "O card visual em alta definição foi salvo no seu computador.");
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Divulgar e Exportar Resultados do Evento"
      description={`Gere mensagens formatadas para grupos de WhatsApp, cards de divulgação ou relatórios para o evento "${eventName}".`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === "whatsapp"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Texto para WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab("visual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === "visual"
                ? "bg-white text-unifap-navy shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-unifap-gold" />
            <span>Card Visual (PNG)</span>
          </button>

          <button
            onClick={() => setActiveTab("exports")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === "exports"
                ? "bg-white text-unifap-navy shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Download className="w-4 h-4 text-unifap-blue" />
            <span>Arquivos (Excel / PDF)</span>
          </button>
        </div>

        {/* TAB 1: WhatsApp Text */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mensagem com formatação pronta (emojis, negritos e títulos) para postar no grupo da turma/evento.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 ml-2"
                onClick={copyToClipboard}
                leftIcon={<Copy className="w-3.5 h-3.5" />}
              >
                Copiar Texto
              </Button>
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={12}
                value={whatsAppText}
                className="w-full p-4 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-xs border border-slate-800 leading-relaxed focus:outline-none select-all"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Visual Card */}
        {activeTab === "visual" && (
          <div className="space-y-4">
            {/* Visual Preview Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-unifap-dark via-unifap-navy to-slate-950 text-white border-2 border-unifap-gold/60 shadow-xl text-center space-y-4">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-unifap-gold mb-1">
                  Centro Universitário Paraíso — UniFAP
                </div>
                <h3 className="text-lg font-black text-white flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5 text-unifap-gold" />
                  <span>Resultado Oficial dos Sorteados</span>
                </h3>
                <div className="text-xs font-semibold text-blue-200 mt-0.5">{eventName}</div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {winners.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400">Nenhum sorteio registrado ainda.</div>
                ) : (
                  winners.map((w, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <span className="font-mono font-black text-slate-950 bg-unifap-gold px-2 py-0.5 rounded-md text-[11px]">
                          #{padNumber(w.drawnNumber || w.winnerParticipant?.ticketNumber || idx + 1, 3)}
                        </span>
                        <span className="font-bold text-white">
                          {w.winnerParticipant?.name || w.drawnName}
                        </span>
                      </div>
                      <div className="text-amber-300 font-semibold text-[11px]">
                        🎁 {w.prize?.name}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-white/10 text-[11px] text-blue-200/80">
                ✨ Parabéns aos contemplados!
              </div>
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full font-black text-sm shadow-lg shadow-amber-500/20"
              onClick={downloadCardImage}
              isLoading={isGeneratingImage}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Baixar Card Oficial em Alta Definição (PNG)
            </Button>
          </div>
        )}

        {/* TAB 3: File Exports */}
        {activeTab === "exports" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href={eventId ? `/api/events/${eventId}/export?format=xlsx` : `/api/results/export?format=xlsx`}
              download
              className="p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex flex-col items-center text-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-800">Planilha Excel (.xlsx)</div>
                <div className="text-xs text-slate-500 mt-0.5">Tabela estruturada com bilhetes, nomes, CPFs e prêmios.</div>
              </div>
              <span className="text-xs font-bold text-emerald-700 underline">Baixar Planilha</span>
            </a>

            <a
              href={eventId ? `/api/events/${eventId}/export?format=html` : `/api/results/export?format=html`}
              target="_blank"
              rel="noreferrer"
              className="p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition flex flex-col items-center text-center space-y-3 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-unifap-navy border border-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-800">Ata de Resultados (PDF)</div>
                <div className="text-xs text-slate-500 mt-0.5">Documento institucional para impressão ou arquivamento.</div>
              </div>
              <span className="text-xs font-bold text-unifap-navy underline">Abrir / Imprimir PDF</span>
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
