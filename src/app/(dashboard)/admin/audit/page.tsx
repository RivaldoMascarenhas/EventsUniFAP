"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/layout/EmptyState";
import { formatDateTime } from "@/lib/utils";
import {
  ShieldCheck,
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileText,
  Printer,
  Filter,
  Activity,
  UserCheck,
  SlidersHorizontal,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: any;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const params = new URLSearchParams();
      params.set("limit", "500");

      const res = await fetch(`/api/audit?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Extract distinct entities & actions for filters
  const distinctActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  const distinctEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Client-side filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedAction !== "ALL" && log.action !== selectedAction) return false;
      if (selectedEntity !== "ALL" && log.entity !== selectedEntity) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const userName = (log.user?.name || "").toLowerCase();
      const userEmail = (log.user?.email || "").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const entity = (log.entity || "").toLowerCase();
      const ip = (log.ipAddress || "").toLowerCase();
      const metadataStr = typeof log.metadata === "string" ? log.metadata.toLowerCase() : JSON.stringify(log.metadata || {}).toLowerCase();

      return (
        userName.includes(term) ||
        userEmail.includes(term) ||
        action.includes(term) ||
        entity.includes(term) ||
        ip.includes(term) ||
        metadataStr.includes(term)
      );
    });
  }, [logs, selectedAction, selectedEntity, searchTerm]);

  // Export URLs
  const getExportUrl = (format: "xlsx" | "csv" | "html") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (selectedAction !== "ALL") params.set("action", selectedAction);
    if (selectedEntity !== "ALL") params.set("entity", selectedEntity);
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    return `/api/audit/export?${params.toString()}`;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("DELETE") || action.includes("CANCEL")) return "destructive";
    if (action.includes("CREATE") || action.includes("WINNER") || action.includes("DRAW_COMPLETED")) return "success";
    if (action.includes("UPDATE") || action.includes("EXPORT")) return "warning";
    return "navy";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria & Conformidade"
        subtitle="Registro imutável de ações administrativas, acessos e sorteios realizados"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchLogs(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition disabled:opacity-50"
              title="Atualizar registros"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-unifap-navy" : ""}`} />
              <span>{isRefreshing ? "Atualizando..." : "Atualizar"}</span>
            </button>

            {/* Export buttons */}
            <a href={getExportUrl("xlsx")} download>
              <Button variant="outline" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
                Excel (.xlsx)
              </Button>
            </a>

            <a href={getExportUrl("csv")} download>
              <Button variant="outline" size="sm" leftIcon={<FileText className="w-4 h-4 text-blue-600" />}>
                CSV
              </Button>
            </a>

            <a href={getExportUrl("html")} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" size="sm" leftIcon={<Printer className="w-4 h-4" />}>
                Imprimir Relatório / PDF
              </Button>
            </a>
          </div>
        }
      />

      {/* Filters Bar */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuário, ação, e-mail, IP ou detalhe da operação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
            >
              <option value="ALL">Todas as Ações</option>
              {distinctActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-unifap-navy/20 focus:border-unifap-navy transition"
            >
              <option value="ALL">Todas as Entidades</option>
              {distinctEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> registro(s) de auditoria
            </span>
          </div>
          {(selectedAction !== "ALL" || selectedEntity !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setSelectedAction("ALL");
                setSelectedEntity("ALL");
                setSearchTerm("");
              }}
              className="text-xs text-unifap-navy font-semibold hover:underline"
            >
              Resetar Filtros
            </button>
          )}
        </div>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {isLoading ? (
          <LoadingState message="Carregando trilha de auditoria e conformidade..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Data e Hora</th>
                  <th className="py-3 px-4">Usuário Responsável</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Entidade</th>
                  <th className="py-3 px-4">IP / Metadados da Operação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      {searchTerm || selectedAction !== "ALL" || selectedEntity !== "ALL"
                        ? "Nenhum registro de auditoria encontrado com os filtros aplicados."
                        : "Nenhum registro de auditoria encontrado."}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.user ? log.user.name : "Sistema / Público"}
                        {log.user && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {log.user.email} • {log.user.role}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action) as any}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {log.entity}
                        {log.entityId && (
                          <div className="text-[10px] text-slate-400 font-mono font-normal truncate max-w-[140px]">
                            ID: {log.entityId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm font-mono text-[11px]">
                        <div className="truncate" title={typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata || {})}>
                          {log.metadata
                            ? typeof log.metadata === "string"
                              ? log.metadata
                              : JSON.stringify(log.metadata)
                            : log.ipAddress || "-"}
                        </div>
                        {log.ipAddress && log.metadata && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
