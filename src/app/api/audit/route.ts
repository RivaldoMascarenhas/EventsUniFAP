import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuditService } from "@/lib/services/auditService";
import { AuditAction } from "@/lib/types/enums";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity") || undefined;
    const action = (searchParams.get("action") as AuditAction) || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const logs = await AuditService.getLogs({
      entity,
      action,
      limit,
      offset,
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao buscar auditoria" }, { status: 500 });
  }
}
