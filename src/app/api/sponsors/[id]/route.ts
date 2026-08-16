import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sponsorSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = sponsorSchema.partial().parse(body);

    const updated = await prisma.sponsor.update({
      where: { id },
      data: validated,
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.SPONSOR_UPDATED,
      entity: "Sponsor",
      entityId: id,
      metadata: validated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao atualizar patrocinador" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.sponsor.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.SPONSOR_DELETED,
      entity: "Sponsor",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao excluir patrocinador" }, { status: 400 });
  }
}
