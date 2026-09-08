import type { Prisma, PrismaClient } from "@prisma/client";
type Db = PrismaClient | Prisma.TransactionClient;
export async function queueCommunication(
  db: Db,
  input: {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
    payload?: Prisma.InputJsonValue;
  },
) {
  await db.notification.create({
    data: {
      recipientId: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    },
  });
  return db.outboxMessage.create({
    data: {
      recipientId: input.recipientId,
      template: input.type,
      subject: input.title,
      payload: input.payload ?? {
        message: input.message,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
      },
    },
  });
}
