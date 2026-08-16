import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "A confirmação de senha é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas digitadas não conferem.",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
    }

    const body = await req.json();
    const validated = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Usuário não encontrado ou inativo." }, { status: 404 });
    }

    // If voluntary change (not forced first access reset), verify current password
    if (!user.mustChangePassword && validated.currentPassword) {
      const isCurrentValid = await bcrypt.compare(validated.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: "A senha atual informada está incorreta." }, { status: 400 });
      }
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    await AuditService.log({
      userId: user.id,
      action: AuditAction.USER_UPDATED,
      entity: "User",
      entityId: user.id,
      metadata: {
        action: "PASSWORD_CHANGED",
        firstAccessReset: user.mustChangePassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso! Você já pode utilizar a plataforma normalmente.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/change-password]", error);
    if (error.errors && error.errors[0]?.message) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Erro ao alterar a senha." }, { status: 400 });
  }
}
