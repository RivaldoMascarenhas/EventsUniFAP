import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/lib/types/enums";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export class AuditService {
  static async log(params: LogAuditParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId || undefined,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId || undefined,
          ipAddress: params.ipAddress || undefined,
          userAgent: params.userAgent || undefined,
          metadata: params.metadata
            ? typeof params.metadata === "string"
              ? params.metadata
              : JSON.stringify(params.metadata)
            : undefined,
        },
      });
    } catch (err) {
      console.error("[AuditService] Error recording audit log:", err);
      // We don't throw to avoid failing main operations on audit failure, but log securely
    }
  }

  static async getLogs(options?: {
    entity?: string;
    action?: AuditAction;
    limit?: number;
    offset?: number;
  }) {
    const { entity, action, limit = 50, offset = 0 } = options || {};
    return await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
      skip: offset,
    });
  }
}
