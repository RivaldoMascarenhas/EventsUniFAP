import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskCPF } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const draws = await prisma.draw.findMany({
      include: {
        event: { select: { id: true, name: true, slug: true } },
        prize: {
          include: { sponsor: true },
        },
        winnerParticipant: {
          select: {
            id: true,
            name: true,
            ticketNumber: true,
            registration: true,
            category: true,
            cpf: true,
          },
        },
        operator: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      take: 200,
    });

    const sanitized = draws.map((d) => ({
      ...d,
      winnerParticipant: d.winnerParticipant
        ? {
            ...d.winnerParticipant,
            cpf: d.winnerParticipant.cpf ? maskCPF(d.winnerParticipant.cpf) : null,
          }
        : null,
    }));

    return NextResponse.json(sanitized, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar resultados" }, { status: 500 });
  }
}

