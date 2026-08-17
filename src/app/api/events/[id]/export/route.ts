import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExportService, WinnerExportItem, ParticipantExportItem } from "@/lib/services/exportService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito a administradores e operadores" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const type = searchParams.get("type") || "winners"; // "winners" or "participants"

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          orderBy: { ticketNumber: "asc" },
        },
        draws: {
          include: {
            prize: { include: { sponsor: true } },
            winnerParticipant: true,
            operator: true,
          },
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // 1. Export Participants List
    if (type === "participants") {
      const participantItems: ParticipantExportItem[] = event.participants.map((p) => ({
        ticketNumber: p.ticketNumber,
        name: p.name,
        cpf: p.cpf,
        registration: p.registration,
        email: p.email,
        phone: p.phone,
        category: p.category,
        isWinner: p.isWinner,
        isEligible: p.isEligible,
        registeredAt: p.registeredAt,
      }));

      if (format === "csv") {
        const csv = ExportService.generateParticipantsCsv(event.name, participantItems);
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="participantes-${event.slug}.csv"`,
          },
        });
      }

      if (format === "html" || format === "pdf") {
        const html = ExportService.generateParticipantsPrintableHtml(event.name, event.date, participantItems);
        return new NextResponse(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        });
      }

      // Default: Excel XLSX
      const buffer = ExportService.generateParticipantsXlsx(event.name, participantItems);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="participantes-${event.slug}.xlsx"`,
        },
      });
    }

    // 2. Export Winners List
    const exportItems: WinnerExportItem[] = event.draws.map((d) => ({
      drawnNumber: d.drawnNumber || d.winnerParticipant.ticketNumber,
      winnerName: d.winnerParticipant.name,
      cpf: d.winnerParticipant.cpf,
      registration: d.winnerParticipant.registration,
      email: d.winnerParticipant.email,
      phone: d.winnerParticipant.phone,
      category: d.winnerParticipant.category,
      prizeName: d.prize.name,
      sponsorName: d.prize.sponsor?.name || "UniFAP",
      drawDate: d.timestamp,
      operatorName: d.operator?.name || "Sistema",
    }));

    if (format === "csv") {
      const csv = ExportService.generateWinnersCsv(event.name, exportItems);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="resultados-${event.slug}.csv"`,
        },
      });
    }

    if (format === "html" || format === "pdf") {
      const html = ExportService.generatePrintableHtmlReport(event.name, event.date, exportItems);
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Default: Excel XLSX
    const buffer = ExportService.generateWinnersXlsx(event.name, exportItems);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="resultados-${event.slug}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/events/[id]/export]", error);
    return NextResponse.json({ error: error.message || "Erro ao exportar dados" }, { status: 500 });
  }
}
