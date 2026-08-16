import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export class ParticipantService {
  /**
   * Generates the next sequential ticket number for an event
   */
  public static async getNextTicketNumber(eventId: string): Promise<number> {
    const highest = await prisma.participant.findFirst({
      where: { eventId },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });

    return (highest?.ticketNumber ?? 0) + 1;
  }

  /**
   * Registers a single participant (Admin or Public)
   */
  public static async registerParticipant(params: {
    eventId: string;
    name: string;
    cpf?: string | null;
    registration?: string | null;
    email?: string | null;
    phone?: string | null;
    category?: string | null;
    isEligible?: boolean;
  }) {
    const { eventId, name, cpf, registration, email, phone, category, isEligible = true } = params;

    // Check duplicate within event by CPF (if provided) or registration (if provided) or email (if provided)
    const existing = await prisma.participant.findFirst({
      where: {
        eventId,
        OR: [
          ...(cpf ? [{ cpf: cpf.replace(/\D/g, "") }] : []),
          ...(registration ? [{ registration: registration.trim() }] : []),
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      if (cpf && existing.cpf === cpf.replace(/\D/g, "")) {
        throw new Error("Já existe um participante cadastrado com este CPF neste evento.");
      }
      if (registration && existing.registration === registration.trim()) {
        throw new Error("Já existe um participante cadastrado com esta matrícula neste evento.");
      }
      if (email && existing.email === email.trim().toLowerCase()) {
        throw new Error("Já existe um participante cadastrado com este e-mail neste evento.");
      }
    }

    // Get event max participants limit check if set
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { maxParticipants: true },
    });

    if (event?.maxParticipants) {
      const currentCount = await prisma.participant.count({ where: { eventId } });
      if (currentCount >= event.maxParticipants) {
        throw new Error("O limite máximo de participantes para este evento foi atingido.");
      }
    }

    const ticketNumber = await this.getNextTicketNumber(eventId);

    const participant = await prisma.participant.create({
      data: {
        eventId,
        name: name.trim(),
        cpf: cpf ? cpf.replace(/\D/g, "") : null,
        registration: registration ? registration.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        category: category ? category.trim() : "Geral",
        ticketNumber,
        isEligible,
      },
    });

    return participant;
  }

  /**
   * Fetches participants for an event with search, filtering and pagination
   */
  public static async getParticipants(eventId: string, options?: {
    search?: string;
    category?: string;
    isEligible?: boolean;
    isWinner?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { search, category, isEligible, isWinner, page = 1, limit = 50 } = options || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ParticipantWhereInput = {
      eventId,
      ...(category ? { category } : {}),
      ...(typeof isEligible === "boolean" ? { isEligible } : {}),
      ...(typeof isWinner === "boolean" ? { isWinner } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { registration: { contains: search } },
              { email: { contains: search } },
              ...(isNaN(Number(search)) ? [] : [{ ticketNumber: Number(search) }]),
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.participant.count({ where }),
      prisma.participant.findMany({
        where,
        orderBy: { ticketNumber: "asc" },
        take: limit,
        skip,
      }),
    ]);

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  /**
   * Toggles participant eligibility
   */
  public static async toggleEligibility(participantId: string, isEligible: boolean) {
    return await prisma.participant.update({
      where: { id: participantId },
      data: { isEligible },
    });
  }
}
