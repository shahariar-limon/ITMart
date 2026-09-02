import type { ClientSession } from "mongoose";
import { NotificationModel } from "./notification.model.js";
export async function notify(
  input: {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    resourceType?: string;
    resourceId?: string;
  },
  session?: ClientSession,
) {
  const [notification] = await NotificationModel.create([input], {
    ...(session ? { session } : {}),
  });
  return notification;
}
