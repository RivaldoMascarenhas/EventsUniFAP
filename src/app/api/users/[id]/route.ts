import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "OPERATOR", "PRESENTER"]).optional(),
  active: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validated = updateUserSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Check email uniqueness if changing email
    if (validated.email && validated.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validated.email.trim().toLowerCase() },
      });
      if (emailExists) {
        return NextResponse.json({ error: "Já existe outro usuário com este e-mail." }, { status: 400 });
      }
    }

    const dataToUpdate: any = {};
    if (validated.name) dataToUpdate.name = validated.name.trim();
    if (validated.email) dataToUpdate.email = validated.email.trim().toLowerCase();
    if (validated.role) dataToUpdate.role = validated.role;
    if (typeof validated.active === "boolean") dataToUpdate.active = validated.active;
    if (typeof validated.mustChangePassword === "boolean") dataToUpdate.mustChangePassword = validated.mustChangePassword;

    if (validated.password && validated.password.trim().length >= 6) {
      dataToUpdate.passwordHash = await bcrypt.hash(validated.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.USER_UPDATED,
      entity: "User",
      entityId: id,
      metadata: {
        updatedUserId: id,
        changes: Object.keys(dataToUpdate),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[PATCH /api/users/[id]]", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar usuário" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { id } = await params;

    // Safety check: Prevent Admin from deleting their own account
    if (session.user.id === id) {
      return NextResponse.json({ error: "Você não pode excluir sua própria conta de administrador em uso." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { drawsExecuted: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // If user has executed draws, deactivate instead of hard delete to preserve audit integrity
    if (user._count.drawsExecuted > 0) {
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      await AuditService.log({
        userId: session.user.id,
        action: AuditAction.USER_UPDATED,
        entity: "User",
        entityId: id,
        metadata: { action: "DEACTIVATED_DUE_TO_AUDIT_HISTORY", email: user.email },
      });

      return NextResponse.json({ message: "Usuário desativado para preservar o histórico de sorteios já realizados." });
    }

    await prisma.user.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.USER_DELETED,
      entity: "User",
      entityId: id,
      metadata: { deletedEmail: user.email, name: user.name },
    });

    return NextResponse.json({ message: "Usuário removido com sucesso." });
  } catch (error: any) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json({ error: error.message || "Erro ao excluir usuário" }, { status: 400 });
  }
}
