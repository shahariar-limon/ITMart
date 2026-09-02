import { Schema, model, type Types } from "mongoose";

export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "assigned",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface BookingStatusChange {
  from: BookingStatus | null;
  to: BookingStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
}

export interface ServiceBooking {
  bookingNumber: string;
  userId: Types.ObjectId;
  serviceId: Types.ObjectId;
  serviceNameSnapshot: string;
  basePriceSnapshot: number;
  durationMinutesSnapshot: number;
  technicianId?: Types.ObjectId;
  status: BookingStatus;
  preferredStart?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  address: string;
  customerNotes: string;
  technicianNotes: string;
  statusHistory: BookingStatusChange[];
  createdAt: Date;
  updatedAt: Date;
}

const statusChangeSchema = new Schema<BookingStatusChange>(
  {
    from: { type: String, enum: [...BOOKING_STATUSES, null], default: null },
    to: { type: String, enum: BOOKING_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<ServiceBooking>(
  {
    bookingNumber: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    serviceNameSnapshot: { type: String, required: true },
    basePriceSnapshot: { type: Number, required: true, min: 0 },
    durationMinutesSnapshot: { type: Number, required: true, min: 15 },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "requested",
      index: true,
    },
    preferredStart: { type: Date },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    customerNotes: { type: String, default: "", trim: true, maxlength: 2000 },
    technicianNotes: { type: String, default: "", trim: true, maxlength: 2000 },
    statusHistory: { type: [statusChangeSchema], default: [] },
  },
  { timestamps: true },
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({
  technicianId: 1,
  status: 1,
  scheduledStart: 1,
  scheduledEnd: 1,
});
export const ServiceBookingModel = model<ServiceBooking>(
  "ServiceBooking",
  bookingSchema,
);
