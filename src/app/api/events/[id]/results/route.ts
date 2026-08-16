import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;

    const draws = await prisma.draw.findMany({
      where: { eventId },
      include: {
        prize: {
          include: { sponsor: true },
        },
        winnerParticipant: true,
        operator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json(draws);
  } catch (error: any) {
    console.error("[GET /api/events/[id]/results]", error);
    return NextResponse.json({ error: error.message || "Erro ao buscar resultados" }, { status: 500 });
  }
}
