import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

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

    return NextResponse.json(draws, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/events/[id]/results]", error);
    return NextResponse.json({ error: error.message || "Erro ao buscar resultados" }, { status: 500 });
  }
}
