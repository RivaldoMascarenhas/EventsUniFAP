import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";
import { realtimeService } from "@/lib/services/realtimeService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito a administradores e operadores" }, { status: 403 });
    }

    const { id: eventId, participantId } = await params;

    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        eventId,
      },
      include: {
        drawsWon: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado neste evento" }, { status: 404 });
    }

    if (participant.isWinner && participant.drawsWon.length > 0 && session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Este participante é vencedor de um sorteio já realizado. Apenas administradores podem excluí-lo.",
        },
        { status: 400 }
      );
    }

    // Delete participant
    await prisma.participant.delete({
      where: { id: participantId },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PARTICIPANT_DELETED,
      entity: "Participant",
      entityId: participant.id,
      metadata: {
        name: participant.name,
        ticketNumber: participant.ticketNumber,
        eventId,
      },
    });

    // Realtime Broadcast to Presentation Screen & Admin Dashboards
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

    return NextResponse.json({
      success: true,
      message: `Participante "${participant.name}" (#${participant.ticketNumber}) excluído com sucesso.`,
      remainingCount: totalParticipants,
    });
  } catch (error: any) {
    console.error("[DELETE /api/events/[id]/participants/[participantId]]", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir participante" }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const { id: eventId, participantId } = await params;
    const body = await req.json();

    const participant = await prisma.participant.findFirst({
      where: { id: participantId, eventId },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
    }

    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        registration: body.registration !== undefined ? (body.registration ? body.registration.trim() : null) : undefined,
        cpf: body.cpf !== undefined ? (body.cpf ? body.cpf.replace(/\D/g, "") : null) : undefined,
        email: body.email !== undefined ? (body.email ? body.email.trim().toLowerCase() : null) : undefined,
        phone: body.phone !== undefined ? (body.phone ? body.phone.trim() : null) : undefined,
        category: body.category !== undefined ? (body.category ? body.category.trim() : "Geral") : undefined,
        isEligible: body.isEligible !== undefined ? Boolean(body.isEligible) : undefined,
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PARTICIPANT_UPDATED,
      entity: "Participant",
      entityId: updated.id,
      metadata: { name: updated.name, isEligible: updated.isEligible },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/events/[id]/participants/[participantId]]", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar participante" }, { status: 400 });
  }
}
