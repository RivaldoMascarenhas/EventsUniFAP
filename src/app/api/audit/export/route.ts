import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExportService, AuditLogExportItem } from "@/lib/services/exportService";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const search = searchParams.get("search")?.trim() || "";

    const whereCondition: any = {};
    if (action) {
      whereCondition.action = action;
    }
    if (entity) {
      whereCondition.entity = entity;
    }
    if (search) {
      whereCondition.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { metadata: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: whereCondition,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 5000, // Export up to 5000 logs
    });

    const exportItems: AuditLogExportItem[] = logs.map((l) => ({
      id: l.id,
      timestamp: l.timestamp,
      userName: l.user?.name || "Sistema / Público",
      userEmail: l.user?.email,
      userRole: l.user?.role,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      ipAddress: l.ipAddress,
      metadata: l.metadata,
    }));

    // Log this export operation
    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.DATA_EXPORTED,
      entity: "AuditLog",
      metadata: {
        format,
        actionFilter: action || "ALL",
        entityFilter: entity || "ALL",
        totalItems: exportItems.length,
      },
    });

    const timestampStr = new Date().toISOString().split("T")[0];

    if (format === "csv") {
      const csv = ExportService.generateAuditLogsCsv(exportItems);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="trilha-auditoria-unifap-${timestampStr}.csv"`,
        },
      });
    }

    if (format === "html" || format === "pdf") {
      let filterInfo = "Trilha Completa de Auditoria & Conformidade";
      const filters: string[] = [];
      if (action) filters.push(`Ação: ${action}`);
      if (entity) filters.push(`Entidade: ${entity}`);
      if (search) filters.push(`Busca: "${search}"`);
      if (filters.length > 0) {
        filterInfo = filters.join(" | ");
      }

      const html = ExportService.generateAuditLogsPrintableHtml(exportItems, {
        filterInfo,
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Default: Excel XLSX
    const buffer = ExportService.generateAuditLogsXlsx(exportItems);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="trilha-auditoria-unifap-${timestampStr}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/audit/export]", error);
    return NextResponse.json({ error: error.message || "Erro ao exportar trilha de auditoria" }, { status: 500 });
  }
}
