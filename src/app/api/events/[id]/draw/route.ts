import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LotteryService } from "@/lib/services/lotteryService";
import { executeDrawSchema } from "@/lib/validations";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Acesso restrito a operadores de sorteio autorizados" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await req.json();

    const validated = executeDrawSchema.parse({
      ...body,
      eventId,
    });

    const idempotencyKey =
      req.headers.get("idempotency-key") ||
      req.headers.get("x-idempotency-key") ||
      body.idempotencyKey ||
      null;

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await LotteryService.executeDraw({
      eventId: validated.eventId,
      prizeId: validated.prizeId,
      drawType: validated.drawType,
      minNumber: validated.minNumber,
      maxNumber: validated.maxNumber,
      operatorId: session.user.id,
      notes: validated.notes,
      ipAddress,
      userAgent,
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[POST /api/events/[id]/draw]", error);
    return NextResponse.json({ error: error.message || "Erro ao executar sorteio" }, { status: 400 });
  }
}
