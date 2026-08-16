import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "OPERATOR", "PRESENTER"]).default("OPERATOR"),
  active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            drawsExecuted: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ error: error.message || "Erro ao listar usuários" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: validated.email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário cadastrado com este e-mail." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: validated.name.trim(),
        email: validated.email.trim().toLowerCase(),
        passwordHash,
        role: validated.role,
        active: validated.active,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.USER_CREATED,
      entity: "User",
      entityId: newUser.id,
      metadata: {
        createdUserId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: error.message || "Erro ao criar usuário" }, { status: 400 });
  }
}
