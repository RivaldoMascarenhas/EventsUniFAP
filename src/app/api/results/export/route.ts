import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExportService, GeneralResultExportItem } from "@/lib/services/exportService";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const eventId = searchParams.get("eventId") || undefined;
    const search = searchParams.get("search")?.trim() || "";

    const whereCondition: any = {};
    if (eventId) {
      whereCondition.eventId = eventId;
    }
    if (search) {
      whereCondition.OR = [
        { winnerParticipant: { name: { contains: search, mode: "insensitive" } } },
        { winnerParticipant: { email: { contains: search, mode: "insensitive" } } },
        { winnerParticipant: { registration: { contains: search, mode: "insensitive" } } },
        { prize: { name: { contains: search, mode: "insensitive" } } },
        { event: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const draws = await prisma.draw.findMany({
      where: whereCondition,
      include: {
        event: { select: { id: true, name: true, date: true, slug: true } },
        prize: {
          include: { sponsor: true },
        },
        winnerParticipant: true,
        operator: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    const exportItems: GeneralResultExportItem[] = draws.map((d) => ({
      id: d.id,
      drawnNumber: d.drawnNumber || d.winnerParticipant?.ticketNumber || 0,
      winnerName: d.winnerParticipant?.name || d.drawnName || "Participante",
      cpf: d.winnerParticipant?.cpf,
      registration: d.winnerParticipant?.registration,
      email: d.winnerParticipant?.email,
      phone: d.winnerParticipant?.phone,
      category: d.winnerParticipant?.category,
      eventName: d.event?.name || "Evento UniFAP",
      eventDate: d.event?.date,
      prizeName: d.prize?.name || "Prêmio",
      sponsorName: d.prize?.sponsor?.name || "UniFAP",
      drawDate: d.timestamp,
      operatorName: d.operator?.name || "Sistema",
    }));

    // Log export event in audit
    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.DATA_EXPORTED,
      entity: "Results",
      metadata: {
        format,
        eventId: eventId || "ALL",
        totalItems: exportItems.length,
      },
    });

    const timestampStr = new Date().toISOString().split("T")[0];

    if (format === "csv") {
      const csv = ExportService.generateAllResultsCsv(exportItems);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="historico-sorteios-unifap-${timestampStr}.csv"`,
        },
      });
    }

    if (format === "html" || format === "pdf") {
      let filterInfo = "Histórico Geral Consolidado (Todos os Eventos)";
      if (eventId && draws.length > 0) {
        filterInfo = `Evento: ${draws[0].event.name}`;
      } else if (search) {
        filterInfo = `Resultados filtrados por termo: "${search}"`;
      }

      const html = ExportService.generateAllResultsPrintableHtml(exportItems, {
        filterInfo,
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Default: Excel XLSX
    const buffer = ExportService.generateAllResultsXlsx(exportItems);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="historico-sorteios-unifap-${timestampStr}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/results/export]", error);
    return NextResponse.json({ error: error.message || "Erro ao exportar histórico de sorteios" }, { status: 500 });
  }
}
