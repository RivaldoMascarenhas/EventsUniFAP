import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prizeSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const prizes = await prisma.prize.findMany({
      where: eventId ? { eventId } : undefined,
      include: {
        sponsor: true,
        draws: {
          include: {
            winnerParticipant: true,
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(prizes);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar prêmios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const validated = prizeSchema.parse(body);

    const prize = await prisma.prize.create({
      data: {
        eventId: validated.eventId,
        sponsorId: validated.sponsorId || undefined,
        name: validated.name,
        description: validated.description,
        imageUrl: validated.imageUrl,
        quantity: validated.quantity,
        estimatedValue: validated.estimatedValue,
        order: validated.order,
        status: validated.status,
      },
      include: { sponsor: true },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PRIZE_CREATED,
      entity: "Prize",
      entityId: prize.id,
      metadata: { name: prize.name, eventId: prize.eventId },
    });

    return NextResponse.json(prize, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao cadastrar prêmio" }, { status: 400 });
  }
}
