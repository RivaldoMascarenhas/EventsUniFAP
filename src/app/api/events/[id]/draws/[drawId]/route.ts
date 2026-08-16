import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LotteryService } from "@/lib/services/lotteryService";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; drawId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito a administradores e operadores autorizados" }, { status: 403 });
    }

    const { id: eventId, drawId } = await params;

    let reason: string | undefined = undefined;
    let markIneligible: boolean = false;

    try {
      const body = await req.json();
      reason = body.reason;
      markIneligible = Boolean(body.markIneligible);
    } catch {
      // Body may be empty on standard DELETE
    }

    const result = await LotteryService.cancelDraw(drawId, session.user.id, reason, markIneligible);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DELETE /api/events/[id]/draws/[drawId]]", error);
    return NextResponse.json({ error: error.message || "Erro ao anular sorteio" }, { status: 400 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; drawId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito a administradores e operadores autorizados" }, { status: 403 });
    }

    const { id: eventId, drawId } = await params;
    const body = await req.json();
    const reason = body.reason;
    const markIneligible = Boolean(body.markIneligible);

    const result = await LotteryService.cancelDraw(drawId, session.user.id, reason, markIneligible);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/events/[id]/draws/[drawId]]", error);
    return NextResponse.json({ error: error.message || "Erro ao anular sorteio" }, { status: 400 });
  }
}
