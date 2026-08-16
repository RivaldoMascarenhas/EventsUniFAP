import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prizeSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const existingPrize = await prisma.prize.findUnique({
      where: { id },
      include: {
        winners: true,
        draws: true,
      },
    });

    if (!existingPrize) {
      return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
    }

    const isFinalized = existingPrize.status === "DRAWN" || existingPrize.winners.length > 0 || existingPrize.draws.length > 0;

    // Only Admin can edit finalized/drawn prizes
    if (isFinalized && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem editar prêmios já finalizados ou sorteados." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = prizeSchema.partial().parse(body);

    const updated = await prisma.prize.update({
      where: { id },
      data: {
        ...(validated.name ? { name: validated.name } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.imageUrl !== undefined ? { imageUrl: validated.imageUrl } : {}),
        ...(validated.sponsorId !== undefined ? { sponsorId: validated.sponsorId || null } : {}),
        ...(validated.quantity !== undefined ? { quantity: validated.quantity } : {}),
        ...(validated.estimatedValue !== undefined ? { estimatedValue: validated.estimatedValue } : {}),
        ...(validated.order !== undefined ? { order: validated.order } : {}),
        ...(validated.status ? { status: validated.status } : {}),
      },
      include: { sponsor: true },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PRIZE_UPDATED,
      entity: "Prize",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar prêmio" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const { id } = await params;

    const existingPrize = await prisma.prize.findUnique({
      where: { id },
      include: {
        winners: true,
        draws: true,
      },
    });

    if (!existingPrize) {
      return NextResponse.json({ error: "Prêmio não encontrado" }, { status: 404 });
    }

    const isFinalized = existingPrize.status === "DRAWN" || existingPrize.winners.length > 0 || existingPrize.draws.length > 0;

    // Only Admin can delete finalized/drawn prizes
    if (isFinalized && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem excluir prêmios já finalizados ou sorteados." },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.winner.deleteMany({ where: { prizeId: id } }),
      prisma.draw.deleteMany({ where: { prizeId: id } }),
      prisma.prize.delete({ where: { id } }),
    ]);

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.PRIZE_DELETED,
      entity: "Prize",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir prêmio" }, { status: 400 });
  }
}
