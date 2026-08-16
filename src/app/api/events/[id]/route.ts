import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        prizes: {
          include: {
            sponsor: true,
            draws: {
              include: {
                winnerParticipant: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        participants: {
          orderBy: { ticketNumber: "asc" },
          take: 50,
        },
        soundConfig: true,
        theme: true,
        _count: {
          select: {
            participants: true,
            prizes: true,
            draws: true,
            winners: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    console.error("[GET /api/events/[id]]", error);
    return NextResponse.json({ error: error.message || "Erro ao buscar evento" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem editar configurações de eventos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = eventSchema.partial().parse(body);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(validated.name ? { name: validated.name } : {}),
        ...(validated.slug ? { slug: validated.slug } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.date !== undefined ? { date: validated.date ? new Date(validated.date) : null } : {}),
        ...(validated.time !== undefined ? { time: validated.time } : {}),
        ...(validated.location !== undefined ? { location: validated.location } : {}),
        ...(validated.logoUrl !== undefined ? { logoUrl: validated.logoUrl } : {}),
        ...(validated.coverUrl !== undefined ? { coverUrl: validated.coverUrl } : {}),
        ...(validated.status ? { status: validated.status } : {}),
        ...(validated.primaryColor ? { primaryColor: validated.primaryColor } : {}),
        ...(validated.secondaryColor ? { secondaryColor: validated.secondaryColor } : {}),
        ...(typeof validated.allowRepeatWinners === "boolean" ? { allowRepeatWinners: validated.allowRepeatWinners } : {}),
        ...(validated.maxParticipants !== undefined ? { maxParticipants: validated.maxParticipants } : {}),
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.EVENT_UPDATED,
      entity: "Event",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    console.error("[PATCH /api/events/[id]]", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar evento" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem excluir eventos" }, { status: 403 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // Clean cascade deletion of all related data
    await prisma.$transaction([
      prisma.idempotencyRecord.deleteMany({ where: { eventId: id } }),
      prisma.winner.deleteMany({ where: { eventId: id } }),
      prisma.draw.deleteMany({ where: { eventId: id } }),
      prisma.prize.deleteMany({ where: { eventId: id } }),
      prisma.participant.deleteMany({ where: { eventId: id } }),
      prisma.soundConfig.deleteMany({ where: { eventId: id } }),
      prisma.eventTheme.deleteMany({ where: { eventId: id } }),
      prisma.event.delete({ where: { id } }),
    ]);

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.EVENT_DELETED,
      entity: "Event",
      entityId: id,
      metadata: { name: event.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/events/[id]]", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir evento" }, { status: 400 });
  }
}
