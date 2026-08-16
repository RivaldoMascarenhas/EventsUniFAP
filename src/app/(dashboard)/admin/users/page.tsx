"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, LoadingState } from "@/components/layout/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  PlayCircle,
  RefreshCw,
  Mail,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "PRESENTER";
  active: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  _count: {
    drawsExecuted: number;
  };
}

export default function UsersManagementPage() {
  const { data: session } = useSession();
  const { success, error, info } = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
    active: true,
    mustChangePassword: true,
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "OPERATOR",
    active: true,
    mustChangePassword: false,
  });

  // Password Visibility States
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete Modal State
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      error("Erro", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleOpenCreateModal = () => {
    setShowCreatePassword(true);
    setCreateForm({
      name: "",
      email: "",
      password: generateRandomPassword(),
      role: "OPERATOR",
      active: true,
      mustChangePassword: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar usuário");

      success("Usuário Cadastrado!", `O usuário "${data.name}" agora pode acessar a plataforma.`);
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      error("Erro ao cadastrar", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (user: UserItem) => {
    setEditingUserId(user.id);
    setShowEditPassword(false);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      active: user.active,
      mustChangePassword: Boolean(user.mustChangePassword),
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/users/${editingUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          active: editForm.active,
          mustChangePassword: editForm.mustChangePassword,
          ...(editForm.password.trim() ? { password: editForm.password } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar usuário");

      success("Usuário Atualizado!", `Os dados de "${data.name}" foram salvos com sucesso.`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      error("Erro ao atualizar", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    if (session?.user?.id === user.id) {
      error("Ação não permitida", "Você não pode desativar seu próprio usuário.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      success(
        user.active ? "Usuário Desativado" : "Usuário Ativado",
        `O acesso de ${user.name} foi ${user.active ? "bloqueado" : "liberado"}.`
      );
      fetchUsers();
    } catch (err: any) {
      error("Erro", err.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir usuário");

      success("Concluído", data.message || "Usuário removido.");
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      error("Erro ao excluir", err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="gold">Administrador</Badge>;
      case "OPERATOR":
        return <Badge variant="primary">Operador de Sorteio</Badge>;
      case "PRESENTER":
        return <Badge variant="outline">Apresentador</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Usuários & Equipe" },
        ]}
        title="Gerenciamento de Usuários & Operadores"
        subtitle="Controle de acesso institucional para administradores e operadores de sorteio"
        actions={
          <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
            Novo Usuário
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-unifap-navy"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">Todos os Perfis</option>
            <option value="ADMIN">Apenas Administradores</option>
            <option value="OPERATOR">Apenas Operadores</option>
            <option value="PRESENTER">Apenas Apresentadores</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Carregando lista de operadores e administradores..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description="Cadastre novos operadores ou administradores para gerenciar eventos e realizar sorteios."
          action={
            <Button variant="primary" onClick={handleOpenCreateModal}>
              Cadastrar Primeiro Usuário
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((user) => {
            const isMe = session?.user?.id === user.id;

            return (
              <Card key={user.id} className="hover:border-unifap-blue/40 flex flex-col justify-between group">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-unifap-navy text-white flex items-center justify-center font-black text-base shadow-sm">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {getRoleBadge(user.role)}
                      {user.mustChangePassword && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200 flex items-center gap-1 shadow-2xs">
                          <Key className="w-3 h-3 text-amber-600" />
                          <span>Troca Pendente</span>
                        </span>
                      )}
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                          Você
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-unifap-navy tracking-tight">{user.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Status de Acesso</div>
                      <div className="flex items-center gap-1.5 font-bold mt-0.5">
                        {user.active ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-600">
                            <XCircle className="w-3.5 h-3.5" /> Bloqueado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Sorteios Operados</div>
                      <div className="font-bold text-slate-800 mt-0.5 font-mono">
                        {user._count.drawsExecuted}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">Desde {formatDate(user.createdAt)}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={isMe}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition ${
                          user.active
                            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        } ${isMe ? "opacity-30 cursor-not-allowed" : ""}`}
                        title={user.active ? "Desativar Acesso" : "Reativar Acesso"}
                      >
                        {user.active ? "Bloquear" : "Ativar"}
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-unifap-navy hover:bg-slate-50 transition"
                        title="Editar Dados e Senha"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setUserToDelete(user)}
                        disabled={isMe}
                        className={`p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ${
                          isMe ? "opacity-30 cursor-not-allowed" : ""
                        }`}
                        title="Excluir Usuário"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create User */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Cadastrar Novo Usuário"
        description="Defina as credenciais e o nível de acesso do operador ou administrador."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <Label required>Nome Completo</Label>
            <Input
              placeholder="Ex: Prof. Carlos Eduardo"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label required>E-mail Institucional</Label>
            <Input
              type="email"
              placeholder="carlos.eduardo@unifapce.edu.br"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Perfil de Acesso</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
              >
                <option value="OPERATOR">Operador de Sorteio</option>
                <option value="ADMIN">Administrador Geral</option>
                <option value="PRESENTER">Apresentador de Palco</option>
              </select>
            </div>

            <div>
              <Label required>Senha Inicial de Acesso</Label>
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-20 font-mono text-sm"
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="p-1.5 text-slate-400 hover:text-unifap-navy rounded-lg hover:bg-slate-100 transition"
                    title={showCreatePassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({ ...createForm, password: generateRandomPassword() });
                      setShowCreatePassword(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-unifap-navy rounded-lg hover:bg-slate-100 transition"
                    title="Gerar nova senha segura"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Exigir redefinição de senha no próximo login?</span>
              </div>
              <div className="text-[11px] text-amber-700/80">
                O usuário será obrigado a definir sua senha pessoal ao fazer o primeiro acesso.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={createForm.mustChangePassword}
              onChange={(e) => setCreateForm({ ...createForm, mustChangePassword: e.target.checked })}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Status Ativo Imediato?</div>
              <div className="text-[11px] text-slate-500">Se marcado, o usuário poderá fazer login imediatamente.</div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={createForm.active}
              onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Usuário
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Dados do Usuário"
        description="Altere o perfil de acesso, e-mail ou redefina a senha."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <Label required>Nome Completo</Label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label required>E-mail</Label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Perfil de Acesso</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-unifap-navy"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
              >
                <option value="OPERATOR">Operador de Sorteio</option>
                <option value="ADMIN">Administrador Geral</option>
                <option value="PRESENTER">Apresentador de Palco</option>
              </select>
            </div>

            <div>
              <Label>Redefinir Senha (Opcional)</Label>
              <div className="relative">
                <Input
                  type={showEditPassword ? "text" : "password"}
                  placeholder="Deixe em branco para manter"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-unifap-navy rounded-lg hover:bg-slate-100 transition"
                  title={showEditPassword ? "Ocultar senha" : "Ver senha"}
                >
                  {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Exigir redefinição de senha no próximo login?</span>
              </div>
              <div className="text-[11px] text-amber-700/80">
                Força o usuário a cadastrar uma nova senha assim que se autenticar.
              </div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={editForm.mustChangePassword}
              onChange={(e) => setEditForm({ ...editForm, mustChangePassword: e.target.checked })}
            />
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Acesso Habilitado (Ativo)?</div>
              <div className="text-[11px] text-slate-500">Desmarque para bloquear o login temporariamente.</div>
            </div>
            <input
              type="checkbox"
              className="w-5 h-5 rounded text-unifap-navy focus:ring-unifap-navy border-slate-300"
              checked={editForm.active}
              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Delete */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Confirmar Remoção de Usuário"
        description="Esta ação revogará o acesso deste usuário permanentemente."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Tem certeza de que deseja remover o usuário <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteUser} isLoading={isDeleting}>
              Sim, Remover Usuário
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
