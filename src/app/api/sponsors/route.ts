import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sponsorSchema } from "@/lib/validations";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function GET() {
  try {
    const sponsors = await prisma.sponsor.findMany({
      include: {
        _count: {
          select: { prizes: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(sponsors);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar patrocinadores" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const validated = sponsorSchema.parse(body);

    const sponsor = await prisma.sponsor.create({
      data: validated,
    });

    await AuditService.log({
      userId: session.user.id,
      action: AuditAction.SPONSOR_CREATED,
      entity: "Sponsor",
      entityId: sponsor.id,
      metadata: { name: sponsor.name },
    });

    return NextResponse.json(sponsor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro ao criar patrocinador" }, { status: 400 });
  }
}
