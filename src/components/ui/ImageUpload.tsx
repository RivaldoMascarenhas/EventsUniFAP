"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Image as ImageIcon, Loader2, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "./Button";
import { useToast } from "./ToastProvider";

export interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
  className?: string;
  helperText?: string;
  hideLabel?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  label = "Logo / Imagem do Evento",
  folder = "events",
  className = "",
  helperText = "Formatos recomendados: PNG, JPG ou WebP (Máx: 5MB)",
  hideLabel = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error, success } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error("Arquivo muito grande", "A imagem deve ter no máximo 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload da imagem");

      onChange(data.url);
      success("Imagem Carregada!", "A imagem foi enviada com sucesso.");
    } catch (err: any) {
      error("Falha no Upload", err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {!hideLabel && label && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label className="block text-xs font-bold uppercase text-slate-700">{label}</label>

            {/* Explanatory "?" Specs Tooltip */}
            <div className="relative inline-flex items-center group/info">
              <button
                type="button"
                className="text-slate-400 hover:text-unifap-navy transition-colors p-0.5 rounded-full hover:bg-slate-100 focus:outline-hidden cursor-help"
                title="Ver recomendações de resolução e formato"
                aria-label="Recomendações de imagem"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {/* Floating Tooltip Specs Card */}
              <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 p-3.5 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-700/80 text-xs pointer-events-none opacity-0 group-hover/info:opacity-100 group-hover/info:pointer-events-auto transition-all duration-200 z-50 transform -translate-y-1 group-hover/info:translate-y-0 backdrop-blur-xl">
                <div className="font-bold text-unifap-gold mb-2 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Especificações Recomendadas</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-unifap-gold font-bold">•</span>
                    <span><strong className="text-white">Tamanho máximo:</strong> até 5 MB por arquivo.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-unifap-gold font-bold">•</span>
                    <span><strong className="text-white">Formatos aceitos:</strong> PNG, SVG, JPG, JPEG ou WebP.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-unifap-gold font-bold">•</span>
                    <span><strong className="text-white">Logomarcas:</strong> 500×500px (1:1 Quadrada) ou 600×200px (Horizontal). Fundo transparente (PNG/SVG) é ideal.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-unifap-gold font-bold">•</span>
                    <span><strong className="text-white">Capas & Telão 4K:</strong> 1920×1080px (16:9) ou 1200×630px para máxima nitidez no projetor.</span>
                  </div>
                </div>

                {/* Triangle Pointer */}
                <div className="absolute left-3 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-950" />
              </div>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Máx. 5MB</span>
        </div>
      )}

      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-2.5 flex items-center gap-4 transition hover:border-unifap-navy/40">
          <div className="w-28 h-20 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0 p-2 shadow-xs">
            <img src={value} alt="Preview" className="max-w-full max-h-full object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">{label || "Imagem Carregada"}</div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span>✓ Imagem pronta para o telão</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Alterar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={handleRemove}
                disabled={isUploading}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            isUploading
              ? "border-unifap-navy bg-slate-50 opacity-70"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-unifap-navy"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="w-7 h-7 text-unifap-navy animate-spin" />
              <span className="text-xs font-bold text-slate-700">Enviando imagem...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-unifap-navy shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800">Clique para selecionar a imagem</span>
                <p className="text-[11px] text-slate-500 mt-0.5">{helperText}</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
