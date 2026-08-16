import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParticipantService } from "@/lib/services/participantService";
import { participantSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const isEligibleParam = searchParams.get("isEligible");
    const isEligible = isEligibleParam !== null ? isEligibleParam === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const result = await ParticipantService.getParticipants(eventId, {
      search,
      category,
      isEligible,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/events/[id]/participants]", error);
    return NextResponse.json({ error: error.message || "Erro ao buscar participantes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await req.json();

    const validated = participantSchema.parse({
      ...body,
      eventId,
    });

    const participant = await ParticipantService.registerParticipant(validated);

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PARTICIPANT_CREATED,
      entity: "Participant",
      entityId: participant.id,
      metadata: { name: participant.name, ticketNumber: participant.ticketNumber },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/events/[id]/participants]", error);
    return NextResponse.json({ error: error.message || "Erro ao cadastrar participante" }, { status: 400 });
  }
}
