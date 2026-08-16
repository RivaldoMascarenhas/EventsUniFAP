"use client";

import React, { useState, useEffect } from "react";
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

export default function SponsorsPage() {
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
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            Novo Patrocinador
          </Button>
        }
      />

      <div className="flex items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm max-w-md">
        <Input
          placeholder="Buscar parceiro..."
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
            <Button variant="primary" onClick={handleOpenCreateModal}>
              Cadastrar Primeiro Patrocinador
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:border-unifap-blue/40 flex flex-col justify-between group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-inner">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 text-xs font-bold text-unifap-navy bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Trophy className="w-3.5 h-3.5 text-unifap-gold" />
                      <span>{s._count.prizes} prêmio(s)</span>
                    </div>
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-unifap-navy hover:bg-slate-50 transition"
                      title="Editar Patrocinador"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-unifap-navy">{s.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {s.description || "Patrocinador institucional de eventos da UniFAP."}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {s.website && (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-unifap-blue transition truncate"
                    >
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.website}</span>
                    </a>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.phone}</span>
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
            label="Logomarca do Patrocinador"
            helperText="Envie a logo em PNG, JPG ou WebP para aparecer nos prêmios e no telão 4K"
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
              placeholder="Breve resumo da empresa..."
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
