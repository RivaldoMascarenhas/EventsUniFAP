import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { realtimeService, RealtimePayload } from "@/lib/services/realtimeService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Validate presentation access via token OR session
  let isAuthorized = false;

  if (token) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, presentationToken: token },
    });
    if (event) isAuthorized = true;
  }

  if (!isAuthorized) {
    const session = await getServerSession(authOptions);
    if (session) isAuthorized = true;
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Token de apresentação inválido ou não autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set up SSE Stream
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (payload: RealtimePayload) => {
    try {
      const data = `data: ${JSON.stringify(payload)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch {
      // Connection closed by client
    }
  };

  const unsubscribe = realtimeService.subscribe(eventId, sendEvent);

  req.signal.addEventListener("abort", () => {
    unsubscribe();
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const body = await req.json();

    const { type, state, prizeId, prize, winner } = body;

    realtimeService.publish(eventId, {
      type,
      eventId,
      state,
      prizeId,
      prize,
      winner,
    });

    return NextResponse.json({ success: true, state: realtimeService.getState(eventId) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro no realtime" }, { status: 400 });
  }
}
