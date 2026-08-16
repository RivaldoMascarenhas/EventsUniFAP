import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ParticipantService } from "@/lib/services/participantService";
import { publicRegistrationSchema } from "@/lib/validations";
import { isValidCPF } from "@/lib/utils";
import { rateLimiter } from "@/lib/security/rateLimiter";
import { realtimeService } from "@/lib/services/realtimeService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const body = await req.json();

    // 1. Anti-Bot Honeypot Trap
    if (body._hp_unifap || body.botField) {
      return NextResponse.json({ success: true, message: "Inscrição processada" }, { status: 200 });
    }

    // 2. Anti-Flood Rate Limiting per IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const { allowed } = rateLimiter.check(clientIp, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Limite de tentativas excedido para este dispositivo. Aguarde 1 minuto para tentar novamente.",
        },
        { status: 429 }
      );
    }

    // 3. Schema Parsing
    const validated = publicRegistrationSchema.parse({
      ...body,
      eventId,
    });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, status: true },
    });

    if (!event || (event.status !== "ACTIVE" && event.status !== "SCHEDULED")) {
      return NextResponse.json(
        { error: "As inscrições para este evento não estão abertas no momento." },
        { status: 400 }
      );
    }

    // 4. Document Normalization and Algorithmic CPF Validation
    const cleanDoc = validated.registration.replace(/\D/g, "");
    let isCpf = false;
    let isMatricula = false;

    if (cleanDoc.length === 11) {
      // It's formatted like a CPF -> validate mathematical digits (módulo 11)
      if (!isValidCPF(cleanDoc)) {
        return NextResponse.json(
          {
            error: "O CPF informado é inválido. Por favor, verifique os 11 dígitos digitados.",
          },
          { status: 400 }
        );
      }
      isCpf = true;
    } else {
      isMatricula = true;
    }

    // 5. Anti-Fraud Duplication Check: Prevent 1 person from gaining multiple tickets
    const existing = await prisma.participant.findFirst({
      where: {
        eventId: event.id,
        OR: [
          ...(isCpf ? [{ cpf: cleanDoc }] : []),
          ...(isMatricula ? [{ registration: validated.registration.trim() }] : []),
          ...(validated.email && validated.email.trim() ? [{ email: validated.email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      // Return existing ticket smoothly without creating extra tickets
      return NextResponse.json(
        {
          success: true,
          alreadyRegistered: true,
          message: `Você já está inscrito neste sorteio! Seu Número da Sorte é #${existing.ticketNumber}.`,
          participant: {
            id: existing.id,
            name: existing.name,
            ticketNumber: existing.ticketNumber,
            registration: existing.registration,
            eventName: event.name,
            registeredAt: existing.registeredAt,
          },
        },
        { status: 200 }
      );
    }

    // 6. Secure Server-Side Ticket Registration
    const participant = await ParticipantService.registerParticipant({
      eventId: event.id,
      name: validated.name.trim(),
      cpf: isCpf ? cleanDoc : null,
      registration: isMatricula ? validated.registration.trim() : null,
      email: validated.email ? validated.email.trim().toLowerCase() : null,
      phone: validated.phone ? validated.phone.trim() : null,
      category: validated.category || "Aluno de Graduação",
      isEligible: true,
    });

    // Notify open admin dashboards in realtime via WebSocket
    realtimeService.broadcastGlobalUpdate({
      type: "participant:registered",
      eventId: event.id,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        participant: {
          id: participant.id,
          name: participant.name,
          ticketNumber: participant.ticketNumber,
          registration: participant.registration,
          eventName: event.name,
          registeredAt: participant.registeredAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/events/[id]/public-registration]", error);
    return NextResponse.json({ error: error.message || "Erro ao realizar inscrição" }, { status: 400 });
  }
}
