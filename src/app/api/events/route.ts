import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const events = await prisma.event.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        _count: {
          select: {
            participants: true,
            prizes: true,
            draws: true,
            winners: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(events, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/events]", error);
    return NextResponse.json({ error: error.message || "Erro ao listar eventos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem criar novos eventos" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = eventSchema.parse(body);

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({
      where: { slug: validatedData.slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe um evento cadastrado com este slug/identificador." }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        description: validatedData.description,
        date: validatedData.date ? new Date(validatedData.date) : null,
        time: validatedData.time,
        location: validatedData.location,
        logoUrl: validatedData.logoUrl || "/branding/unifap-logo.svg",
        coverUrl: validatedData.coverUrl,
        status: validatedData.status,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        allowRepeatWinners: validatedData.allowRepeatWinners,
        maxParticipants: validatedData.maxParticipants,
        registrationOpenRule: validatedData.registrationOpenRule,
        registrationCustomOpensAt: validatedData.registrationCustomOpensAt ? new Date(validatedData.registrationCustomOpensAt) : null,
        soundConfig: {
          create: {
            soundEnabled: true,
            volume: 0.8,
            soundPreset: "institutional",
          },
        },
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.EVENT_CREATED,
      entity: "Event",
      entityId: event.id,
      metadata: { name: event.name, slug: event.slug },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/events]", error);
    return NextResponse.json({ error: error.message || "Erro ao criar evento" }, { status: 400 });
  }
}
