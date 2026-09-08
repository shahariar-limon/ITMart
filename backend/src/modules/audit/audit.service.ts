import type { Prisma, PrismaClient } from "@prisma/client";
type Db = PrismaClient | Prisma.TransactionClient;
export function recordAudit(
  db: Db,
  input: {
    actorId?: string | undefined;
    action: string;
    resourceType: string;
    resourceId: string;
    requestId?: string | undefined;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? {},
    },
  });
}
