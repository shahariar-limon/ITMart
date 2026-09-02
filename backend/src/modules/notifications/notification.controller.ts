import type { Request, Response } from "express";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { NotificationModel } from "./notification.model.js";
function userId(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}
export async function list(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const notifications = await NotificationModel.find({ recipientId: id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const unreadCount = await NotificationModel.countDocuments({
    recipientId: id,
    readAt: { $exists: false },
  });
  response.json({ success: true, data: { notifications, unreadCount } });
}
export async function markRead(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const notificationId = objectIdSchema.parse(request.params.notificationId);
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, recipientId: id },
    { readAt: new Date() },
    { new: true },
  );
  if (!notification)
    throw new AppError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification was not found",
    );
  response.json({ success: true, data: { notification } });
}
export async function markAllRead(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  await NotificationModel.updateMany(
    { recipientId: id, readAt: { $exists: false } },
    { readAt: new Date() },
  );
  response.status(204).send();
}
