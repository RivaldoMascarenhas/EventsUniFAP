import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventRegistrationStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Slug não fornecido" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        date: true,
        time: true,
        location: true,
        logoUrl: true,
        coverUrl: true,
        status: true,
        allowRepeatWinners: true,
        maxParticipants: true,
        registrationOpenRule: true,
        registrationCustomOpensAt: true,
        prizes: {
          select: {
            id: true,
            name: true,
            description: true,
            estimatedValue: true,
            order: true,
            status: true,
            sponsor: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            participants: true,
            prizes: true,
            winners: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const registrationStatus = getEventRegistrationStatus(event);

    return NextResponse.json(
      {
        ...event,
        registrationStatus,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("[GET /api/public/events/[slug]]", error);
    return NextResponse.json({ error: "Erro ao buscar evento" }, { status: 500 });
  }
}
