import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";
import crypto from "crypto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, presentationToken: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    // If no token exists yet, generate one automatically
    let token = event.presentationToken;
    if (!token) {
      token = crypto.randomBytes(24).toString("hex");
      await prisma.event.update({
        where: { id },
        data: { presentationToken: token },
      });
    }

    const presentationUrl = `/presentation/${event.id}?token=${token}`;

    return NextResponse.json({
      token,
      presentationUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao buscar token" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem revogar ou regenerar tokens de apresentação" }, { status: 403 });
    }

    const { id } = await params;
    const newToken = crypto.randomBytes(24).toString("hex");

    const updated = await prisma.event.update({
      where: { id },
      data: { presentationToken: newToken },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PRESENTATION_TOKEN_REVOKED,
      entity: "Event",
      entityId: id,
      metadata: { eventName: updated.name },
    });

    const presentationUrl = `/presentation/${updated.id}?token=${newToken}`;

    return NextResponse.json({
      token: newToken,
      presentationUrl,
      message: "Token de apresentação regenerado com sucesso.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao regenerar token" }, { status: 400 });
  }
}
