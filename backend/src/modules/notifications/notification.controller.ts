import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
function userId(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}
const serialize = <T extends { id: string }>(item: T) => {
  const { id, ...fields } = item;
  return { _id: id, ...fields };
};
export async function list(request: Request, response: Response) {
  const id = userId(request);
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientId: id, readAt: null } }),
  ]);
  response.json({
    success: true,
    data: { notifications: notifications.map(serialize), unreadCount },
  });
}
export async function markRead(request: Request, response: Response) {
  const recipientId = userId(request);
  const id = objectIdSchema.parse(request.params.notificationId);
  const found = await prisma.notification.findFirst({
    where: { id, recipientId },
  });
  if (!found)
    throw new AppError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification was not found",
    );
  const notification = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  response.json({
    success: true,
    data: { notification: serialize(notification) },
  });
}
export async function markAllRead(request: Request, response: Response) {
  await prisma.notification.updateMany({
    where: { recipientId: userId(request), readAt: null },
    data: { readAt: new Date() },
  });
  response.status(204).send();
}
