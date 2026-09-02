import { Schema, model, type Types } from "mongoose";
export interface Notification {
  recipientId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const notificationSchema = new Schema<Notification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, required: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 500 },
    resourceType: { type: String, maxlength: 50 },
    resourceId: { type: Schema.Types.ObjectId },
    readAt: { type: Date },
  },
  { timestamps: true },
);
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export const NotificationModel = model<Notification>(
  "Notification",
  notificationSchema,
);
