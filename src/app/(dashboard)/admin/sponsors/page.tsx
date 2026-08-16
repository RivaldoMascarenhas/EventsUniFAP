"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, LoadingState } from "@/components/layout/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { ImageUpload } from "@/components/ui/ImageUpload";
import {
  Building2,
  Plus,
  Search,
  Globe,
  Instagram,
  Phone,
  Mail,
  Trophy,
  Trash2,
  Edit2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface SponsorItem {
  id: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  website?: string | null;
  instagram?: string | null;
  phone?: string | null;
  email?: string | null;
  _count: {
    prizes: number;
  };
}

function getInitials(name: string) {
  if (!name) return "P";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function SponsorsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isPresenter = session?.user?.role === "PRESENTER";

  const { success, error } = useToast();
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    logoUrl: "",
    description: "",
    website: "",
    instagram: "",
    phone: "",
    email: "",
  });

  const fetchSponsors = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/sponsors");
      if (!res.ok) throw new Error("Erro ao carregar patrocinadores");
      const data = await res.json();
      setSponsors(data);
    } catch (err: any) {
      error("Erro", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSponsorId(null);
    setFormData({
      name: "",
      logoUrl: "",
      description: "",
      website: "",
      instagram: "",
      phone: "",
      email: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sponsor: SponsorItem) => {
    setEditingSponsorId(sponsor.id);
    setFormData({
      name: sponsor.name || "",
      logoUrl: sponsor.logoUrl || "",
      description: sponsor.description || "",
      website: sponsor.website || "",
      instagram: sponsor.instagram || "",
      phone: sponsor.phone || "",
      email: sponsor.email || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteSponsor = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o patrocinador "${name}"?`)) return;

    try {
      const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir patrocinador");
      success("Excluído", `Patrocinador "${name}" excluído com sucesso.`);
      fetchSponsors();
    } catch (err: any) {
      error("Erro ao excluir", err.message);
    }
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Atenção", "O nome do patrocinador é obrigatório.");
      return;
    }

    try {
      setIsSubmitting(true);
      const url = editingSponsorId ? `/api/sponsors/${editingSponsorId}` : "/api/sponsors";
      const method = editingSponsorId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar patrocinador");

      success(
        "Sucesso!",
        editingSponsorId
          ? `Patrocinador "${data.name}" atualizado.`
          : `Patrocinador "${data.name}" cadastrado com sucesso.`
      );
      setIsModalOpen(false);
      fetchSponsors();
    } catch (err: any) {
      error("Erro", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = sponsors.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patrocinadores Oficiais"
        subtitle="Empresas parceiras e marcas apoiadoras dos eventos da UniFAP"
        actions={
          !isPresenter ? (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
              Novo Patrocinador
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-center bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-md">
        <Input
          placeholder="Buscar parceiro por nome ou descrição..."
          leftIcon={<Search className="w-4 h-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingState message="Carregando patrocinadores..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum patrocinador cadastrado"
          description="Cadastre marcas e apoiadores para associá-los aos prêmios dos sorteios."
          action={
            !isPresenter ? (
              <Button variant="primary" onClick={handleOpenCreateModal}>
                Cadastrar Primeiro Patrocinador
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="hover:border-unifap-navy/40 flex flex-col justify-between group overflow-hidden transition-all duration-200 hover:shadow-lg bg-white border border-slate-200/80 rounded-2xl"
            >
              {/* Dedicated Logo Showcase Header */}
              <div className="relative h-36 bg-gradient-to-b from-slate-50 via-slate-50/80 to-slate-100/70 border-b border-slate-100 flex items-center justify-center p-4 overflow-hidden group-hover:from-slate-100/80 group-hover:to-slate-50 transition-colors">
                {/* Floating Badges & Actions */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 backdrop-blur-xs shadow-2xs">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>{s._count.prizes} prêmio(s)</span>
                  </div>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                  {!isPresenter && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-600 hover:text-unifap-navy border border-slate-200/80 shadow-xs transition backdrop-blur-xs"
                        title="Editar Patrocinador"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSponsor(s.id, s.name)}
                          className="p-1.5 rounded-xl bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/80 shadow-xs transition backdrop-blur-xs"
                          title="Excluir Patrocinador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Brand Logo Display */}
                {s.logoUrl ? (
                  <div className="w-full h-full max-h-24 max-w-[88%] flex items-center justify-center p-2.5 rounded-xl bg-white/95 shadow-xs border border-slate-200/60 transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={s.logoUrl}
                      alt={`Logo ${s.name}`}
                      className="max-h-20 max-w-full object-contain filter drop-shadow-2xs"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-unifap-navy to-unifap-blue text-white flex items-center justify-center font-black text-lg shadow-md ring-4 ring-white/80 tracking-wider">
                      {getInitials(s.name)}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Marca Parceira
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-unifap-navy transition line-clamp-1">
                    {s.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                    {s.description || "Patrocinador institucional de eventos da UniFAP."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {s.website && (
                    <a
                      href={s.website.startsWith("http") ? s.website : `https://${s.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-unifap-navy hover:text-unifap-blue font-medium transition truncate group/link"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-unifap-navy shrink-0" />
                      <span className="truncate">{s.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover/link:text-unifap-navy shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {s.instagram && (
                    <a
                      href={`https://instagram.com/${s.instagram.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-pink-600 transition truncate"
                    >
                      <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span className="truncate">{s.instagram.startsWith("@") ? s.instagram : `@${s.instagram}`}</span>
                    </a>
                  )}

                  {s.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-500">{s.email}</span>
                    </div>
                  )}

                  {s.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-500">{s.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: New / Edit Sponsor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSponsorId ? "Editar Patrocinador" : "Cadastrar Novo Patrocinador"}
        description="Adicione as informações da empresa ou marca apoiadora dos eventos e sorteios."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSponsor} className="space-y-4">
          <div>
            <Label required>Nome da Empresa / Marca</Label>
            <Input
              placeholder="Ex: TechParaíso Soluções Digitais"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <ImageUpload
            label="Logo da Marca / Patrocinador"
            helperText="Envie o logotipo em PNG transparente, JPG ou SVG (Horizontal ou Quadrado)"
            folder="sponsors"
            value={formData.logoUrl}
            onChange={(url) => setFormData({ ...formData, logoUrl: url || "" })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Website Oficial</Label>
              <Input
                placeholder="https://empresa.com.br"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
            <div>
              <Label>Instagram (@)</Label>
              <Input
                placeholder="@empresa"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>E-mail de Contato</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input
                placeholder="(88) 3512-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Descrição Institucional</Label>
            <Textarea
              placeholder="Breve resumo da empresa ou categoria de patrocínio..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingSponsorId ? "Salvar Alterações" : "Salvar Patrocinador"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
