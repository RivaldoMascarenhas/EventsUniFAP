import { prisma } from "@/lib/prisma";
import { DrawType, PrizeStatus, AuditAction } from "@/lib/types/enums";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { realtimeService } from "./realtimeService";

export interface ExecuteDrawParams {
  eventId: string;
  prizeId: string;
  drawType?: DrawType;
  minNumber?: number;
  maxNumber?: number;
  operatorId?: string | null;
  notes?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
}

export interface DrawResultPayload {
  drawId: string;
  drawnNumber: number;
  drawnName: string;
  drawType: DrawType;
  timestamp: Date;
  winner: {
    id: string;
    name: string;
    ticketNumber: number;
    registration?: string | null;
    category?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  prize: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    sponsor?: {
      id: string;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
  minNumber?: number;
  maxNumber?: number;
}

export class LotteryService {
  /**
   * Secure cryptographically random index selection in [0, max - 1]
   */
  public static getRandomIndex(max: number): number {
    if (max <= 0) throw new Error("Intervalo inválido para sorteio");
    return crypto.randomInt(0, max);
  }

  /**
   * Executes a draw with transactional locking, duplicate protection and idempotency
   */
  public static async executeDraw(params: ExecuteDrawParams): Promise<DrawResultPayload> {
    const {
      eventId,
      prizeId,
      drawType = DrawType.NUMBER,
      minNumber = 1,
      maxNumber = 100,
      operatorId,
      notes,
      ipAddress,
      userAgent,
      idempotencyKey,
    } = params;

    // 0. Idempotency check: if key already exists, return previous result immediately
    if (idempotencyKey) {
      const cached = await prisma.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (cached && cached.result) {
        return typeof cached.result === "string"
          ? JSON.parse(cached.result)
          : (cached.result as unknown as DrawResultPayload);
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate Event
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          allowRepeatWinners: true,
          status: true,
        },
      });

      if (!event) {
        throw new Error("Evento não encontrado.");
      }

      // 2. Validate and Lock Prize
      const prize = await tx.prize.findFirst({
        where: {
          id: prizeId,
          eventId: eventId,
        },
        include: {
          sponsor: true,
        },
      });

      if (!prize) {
        throw new Error("Prêmio não encontrado para este evento.");
      }

      if (prize.status === PrizeStatus.DRAWN) {
        throw new Error("Este prêmio já foi sorteado e concluído.");
      }

      if (prize.status === PrizeStatus.CANCELLED) {
        throw new Error("Este prêmio foi cancelado.");
      }

      let winner: any = null;
      let drawnNumber: number = 0;
      let drawnName: string = "";

      // -----------------------------------------------------------
      // MODE A: SIMPLE NUMERIC RANGE (Ex: 1 a 100 sem repetição)
      // -----------------------------------------------------------
      if (drawType === DrawType.RANGE) {
        const min = Math.min(minNumber, maxNumber);
        const max = Math.max(minNumber, maxNumber);

        // Find all numbers already drawn in this event
        const previousDraws = await tx.draw.findMany({
          where: {
            eventId,
            status: "COMPLETED",
            drawnNumber: { not: null },
          },
          select: { drawnNumber: true },
        });

        const alreadyDrawnSet = new Set<number>(
          previousDraws.map((d) => d.drawnNumber!).filter((n): n is number => typeof n === "number")
        );

        // Build list of remaining available numbers in [min..max]
        const availablePool: number[] = [];
        for (let i = min; i <= max; i++) {
          if (!alreadyDrawnSet.has(i)) {
            availablePool.push(i);
          }
        }

        if (availablePool.length === 0) {
          throw new Error(
            `Todos os números no intervalo de ${min} a ${max} (${max - min + 1} números) já foram sorteados neste evento.`
          );
        }

        // Cryptographically pick winner from available pool
        const winningIndex = this.getRandomIndex(availablePool.length);
        drawnNumber = availablePool[winningIndex];
        drawnName = `Número da Sorte #${drawnNumber}`;

        // Look for participant or create record for tracking
        let matchedParticipant = await tx.participant.findFirst({
          where: {
            eventId,
            ticketNumber: drawnNumber,
          },
        });

        if (!matchedParticipant) {
          matchedParticipant = await tx.participant.create({
            data: {
              eventId,
              name: `Participante #${drawnNumber}`,
              ticketNumber: drawnNumber,
              category: "Sorteio por Intervalo",
              isEligible: true,
              isWinner: true,
            },
          });
        } else {
          await tx.participant.update({
            where: { id: matchedParticipant.id },
            data: { isWinner: true },
          });
          drawnName = matchedParticipant.name;
        }

        winner = matchedParticipant;
      } else {
        // -----------------------------------------------------------
        // MODE B: REGISTERED PARTICIPANTS (NUMBER / NAME)
        // -----------------------------------------------------------
        const whereCondition: Prisma.ParticipantWhereInput = {
          eventId: eventId,
          isEligible: true,
          status: "ACTIVE",
        };

        if (!event.allowRepeatWinners) {
          whereCondition.isWinner = false;
        }

        const eligibleCandidates = await tx.participant.findMany({
          where: whereCondition,
          orderBy: {
            ticketNumber: "asc",
          },
        });

        if (eligibleCandidates.length === 0) {
          throw new Error(
            event.allowRepeatWinners
              ? "Não há participantes elegíveis cadastrados neste evento."
              : "Não há mais participantes elegíveis disponíveis (todos os participantes ativos já foram contemplados)."
          );
        }

        const winningIndex = this.getRandomIndex(eligibleCandidates.length);
        winner = eligibleCandidates[winningIndex];
        drawnNumber = winner.ticketNumber;
        drawnName = winner.name;

        await tx.participant.update({
          where: { id: winner.id },
          data: { isWinner: true },
        });
      }

      // 5. Create Draw Record
      const draw = await tx.draw.create({
        data: {
          eventId,
          prizeId,
          drawType,
          winnerParticipantId: winner.id,
          drawnNumber: drawnNumber,
          drawnName: drawnName,
          operatorId: operatorId || undefined,
          notes: notes || undefined,
        },
      });

      // 6. Create Winner Record
      await tx.winner.create({
        data: {
          eventId,
          prizeId,
          participantId: winner.id,
          drawId: draw.id,
          drawDate: draw.timestamp,
        },
      });

      // 7. Update Prize Status
      await tx.prize.update({
        where: { id: prize.id },
        data: {
          status: PrizeStatus.DRAWN,
        },
      });

      // 8. Record Audit Log inside transaction
      await tx.auditLog.create({
        data: {
          userId: operatorId || undefined,
          action: AuditAction.DRAW_COMPLETED,
          entity: "Draw",
          entityId: draw.id,
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
          metadata: JSON.stringify({
            eventId,
            eventName: event.name,
            prizeId,
            prizeName: prize.name,
            winnerId: winner.id,
            winnerName: drawnName,
            ticketNumber: drawnNumber,
            drawType,
            minNumber: drawType === DrawType.RANGE ? minNumber : undefined,
            maxNumber: drawType === DrawType.RANGE ? maxNumber : undefined,
            idempotencyKey: idempotencyKey || undefined,
          }),
        },
      });

      const payload: DrawResultPayload = {
        drawId: draw.id,
        drawnNumber: drawnNumber,
        drawnName: drawnName,
        drawType,
        timestamp: draw.timestamp,
        winner: {
          id: winner.id,
          name: drawnName,
          ticketNumber: drawnNumber,
          registration: winner.registration,
          category: winner.category,
          email: winner.email,
          phone: winner.phone,
        },
        prize: {
          id: prize.id,
          name: prize.name,
          description: prize.description,
          imageUrl: prize.imageUrl,
          sponsor: prize.sponsor
            ? {
                id: prize.sponsor.id,
                name: prize.sponsor.name,
                logoUrl: prize.sponsor.logoUrl,
              }
            : null,
        },
        minNumber: drawType === DrawType.RANGE ? Math.min(minNumber, maxNumber) : undefined,
        maxNumber: drawType === DrawType.RANGE ? Math.max(minNumber, maxNumber) : undefined,
      };

      // 9. Store Idempotency Record if key provided
      if (idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            key: idempotencyKey,
            eventId,
            result: JSON.stringify(payload),
          },
        });
      }

      return payload;
    });

    // 10. Broadcast Realtime Result to all listening Presentation screens
    try {
      realtimeService.publish(eventId, {
        type: "draw:result",
        eventId,
        state: "RESULT",
        prizeId: result.prize.id,
        prize: result.prize,
        drawId: result.drawId,
        winner: result,
      });
    } catch (e) {
      console.error("[LotteryService] Realtime publish error:", e);
    }

    return result;
  }

  /**
   * Resets/cancels a completed draw if needed with audit trail, returning the prize to AVAILABLE pool
   */
  public static async cancelDraw(
    drawId: string,
    operatorId?: string,
    reason?: string,
    markIneligible?: boolean
  ) {
    return await prisma.$transaction(async (tx) => {
      const draw = await tx.draw.findUnique({
        where: { id: drawId },
        include: { prize: true, winnerParticipant: true },
      });

      if (!draw) {
        throw new Error("Sorteio não encontrado.");
      }

      // 1. Mark draw as cancelled
      await tx.draw.update({
        where: { id: drawId },
        data: { status: "CANCELLED", notes: reason ? `Cancelado: ${reason}` : "Cancelado pelo operador" },
      });

      // 2. Re-enable prize so it can be drawn again
      await tx.prize.update({
        where: { id: draw.prizeId },
        data: { status: PrizeStatus.AVAILABLE },
      });

      // 3. Check if participant has other active wins
      const otherWins = await tx.winner.count({
        where: {
          participantId: draw.winnerParticipantId,
          drawId: { not: drawId },
        },
      });

      // 4. Update participant winner / eligibility status
      await tx.participant.update({
        where: { id: draw.winnerParticipantId },
        data: {
          ...(otherWins === 0 ? { isWinner: false } : {}),
          ...(markIneligible ? { isEligible: false } : {}),
        },
      });

      // 5. Delete winner record
      await tx.winner.deleteMany({
        where: { drawId },
      });

      // 6. Log cancellation audit
      await tx.auditLog.create({
        data: {
          userId: operatorId || undefined,
          action: AuditAction.DRAW_CANCELLED,
          entity: "Draw",
          entityId: drawId,
          metadata: JSON.stringify({
            prizeId: draw.prizeId,
            prizeName: draw.prize?.name,
            participantId: draw.winnerParticipantId,
            participantName: draw.winnerParticipant?.name,
            reason,
            markIneligible: Boolean(markIneligible),
          }),
        },
      });

      // 7. Publish realtime event to presentation screens
      realtimeService.publish(draw.eventId, {
        type: "draw:cancel",
        eventId: draw.eventId,
        state: "IDLE",
      });

      return {
        success: true,
        prizeId: draw.prizeId,
        prizeName: draw.prize?.name,
        participantId: draw.winnerParticipantId,
        participantName: draw.winnerParticipant?.name,
      };
    });
  }
}
