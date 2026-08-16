import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ImportService } from "@/lib/services/importService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const contentType = req.headers.get("content-type") || "";

    // 1. File Preview Mode (FormData upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customMappingStr = formData.get("mapping") as string | null;

      if (!file) {
        return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const customMapping = customMappingStr ? JSON.parse(customMappingStr) : undefined;

      const preview = await ImportService.previewImport(eventId, fileBuffer, file.name, customMapping);
      return NextResponse.json(preview);
    }

    // 2. Commit Mode (JSON with valid rows)
    const body = await req.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Lista de participantes inválida" }, { status: 400 });
    }

    const result = await ImportService.executeImport({
      eventId,
      rows,
      operatorId: session.user.id,
    });

    // Realtime Broadcast to Presentation Screen & Admin Dashboards
    const { prisma } = await import("@/lib/prisma");
    const { realtimeService } = await import("@/lib/services/realtimeService");
    const totalParticipants = await prisma.participant.count({ where: { eventId } });

    realtimeService.publish(eventId, {
      type: "participant:registered",
      eventId,
      participantCount: totalParticipants,
    }).catch(() => {});

    realtimeService.broadcastGlobalUpdate({
      type: "participant:registered",
      eventId,
      metadata: { participantCount: totalParticipants },
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/events/[id]/participants/import]", error);
    return NextResponse.json({ error: error.message || "Erro na importação" }, { status: 400 });
  }
}
