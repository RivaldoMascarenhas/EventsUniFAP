import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const [
      totalEvents,
      activeEventsCount,
      scheduledEventsCount,
      finishedEventsCount,
      totalParticipants,
      totalDraws,
      totalWinners,
      latestEvents,
      latestDraws,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: "ACTIVE" } }),
      prisma.event.count({ where: { status: "SCHEDULED" } }),
      prisma.event.count({ where: { status: "FINISHED" } }),
      prisma.participant.count(),
      prisma.draw.count(),
      prisma.winner.count(),
      prisma.event.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          _count: {
            select: { participants: true, prizes: true, winners: true, draws: true },
          },
        },
      }),
      prisma.draw.findMany({
        orderBy: { timestamp: "desc" },
        take: 6,
        include: {
          event: { select: { id: true, name: true, slug: true } },
          prize: { select: { name: true, sponsor: { select: { name: true } } } },
          winnerParticipant: { select: { name: true, ticketNumber: true, category: true } },
        },
      }),
    ]);

    return NextResponse.json(
      {
        metrics: {
          totalEvents,
          activeEventsCount,
          scheduledEventsCount,
          finishedEventsCount,
          totalParticipants,
          totalDraws,
          totalWinners,
        },
        latestEvents,
        latestDraws,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao carregar dashboard" }, { status: 500 });
  }
}
