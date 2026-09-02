import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../shared/app-error.js";
import { ServiceModel } from "../services/service.model.js";
import { UserModel } from "../users/user.model.js";
import { ServiceBookingModel, type BookingStatus } from "./booking.model.js";
import { notify } from "../notifications/notification.service.js";

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  assigned: ["cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

function bookingNumber(): string {
  return `SRV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function createBooking(
  userId: string,
  input: {
    serviceId: string;
    preferredStart?: Date | undefined;
    address: string;
    customerNotes: string;
  },
) {
  const service = await ServiceModel.findOne({
    _id: input.serviceId,
    isActive: true,
  }).lean();
  if (!service)
    throw new AppError(404, "SERVICE_NOT_FOUND", "Service was not found");
  const now = new Date();
  if (input.preferredStart && input.preferredStart <= now) {
    throw new AppError(
      422,
      "INVALID_PREFERRED_TIME",
      "Preferred time must be in the future",
    );
  }
  const booking = await ServiceBookingModel.create({
    bookingNumber: bookingNumber(),
    userId,
    serviceId: service._id,
    serviceNameSnapshot: service.name,
    basePriceSnapshot: service.basePrice,
    durationMinutesSnapshot: service.durationMinutes,
    preferredStart: input.preferredStart,
    address: input.address,
    customerNotes: input.customerNotes,
    status: "requested",
    statusHistory: [
      { from: null, to: "requested", changedBy: userId, changedAt: now },
    ],
  });
  await notify({
    recipientId: userId,
    type: "booking.requested",
    title: "Service requested",
    message: `Request ${booking.bookingNumber} was submitted.`,
    resourceType: "booking",
    resourceId: String(booking._id),
  });
  return booking;
}

export async function assignTechnician(
  bookingId: string,
  technicianId: string,
  actorId: string,
) {
  const technician = await UserModel.exists({
    _id: technicianId,
    role: "technician",
    isActive: true,
  });
  if (!technician)
    throw new AppError(
      422,
      "INVALID_TECHNICIAN",
      "An active technician is required",
    );
  const booking = await ServiceBookingModel.findById(bookingId);
  if (!booking)
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  if (booking.status !== "confirmed" && booking.status !== "assigned") {
    throw new AppError(
      409,
      "INVALID_BOOKING_TRANSITION",
      "Only a confirmed booking can be assigned",
    );
  }
  const previous = booking.status;
  booking.technicianId = new mongoose.Types.ObjectId(technicianId);
  booking.status = "assigned";
  booking.statusHistory.push({
    from: previous,
    to: "assigned",
    changedBy: new mongoose.Types.ObjectId(actorId),
    changedAt: new Date(),
  });
  await booking.save();
  await Promise.all([
    notify({
      recipientId: String(booking.userId),
      type: "booking.assigned",
      title: "Technician assigned",
      message: `A technician was assigned to ${booking.bookingNumber}.`,
      resourceType: "booking",
      resourceId: String(booking._id),
    }),
    notify({
      recipientId: technicianId,
      type: "booking.assigned",
      title: "New assignment",
      message: `You were assigned ${booking.bookingNumber}.`,
      resourceType: "booking",
      resourceId: String(booking._id),
    }),
  ]);
  return booking;
}

export async function scheduleBooking(
  bookingId: string,
  scheduledStart: Date,
  actorId: string,
) {
  if (scheduledStart <= new Date())
    throw new AppError(
      422,
      "INVALID_SCHEDULE",
      "Scheduled time must be in the future",
    );
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const booking =
        await ServiceBookingModel.findById(bookingId).session(session);
      if (!booking)
        throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
      if (
        !booking.technicianId ||
        !["assigned", "scheduled"].includes(booking.status)
      ) {
        throw new AppError(
          409,
          "INVALID_BOOKING_TRANSITION",
          "Booking must be assigned before scheduling",
        );
      }
      const technician = await UserModel.findOneAndUpdate(
        { _id: booking.technicianId, role: "technician", isActive: true },
        { $inc: { scheduleVersion: 1 } },
        { new: true, session },
      );
      if (!technician)
        throw new AppError(
          422,
          "INVALID_TECHNICIAN",
          "Assigned technician is unavailable",
        );
      const scheduledEnd = new Date(
        scheduledStart.getTime() + booking.durationMinutesSnapshot * 60_000,
      );
      const conflict = await ServiceBookingModel.exists({
        _id: { $ne: booking._id },
        technicianId: booking.technicianId,
        status: { $in: ["scheduled", "in_progress"] },
        scheduledStart: { $lt: scheduledEnd },
        scheduledEnd: { $gt: scheduledStart },
      }).session(session);
      if (conflict)
        throw new AppError(
          409,
          "TECHNICIAN_UNAVAILABLE",
          "Technician already has an overlapping booking",
        );
      const previous = booking.status;
      booking.scheduledStart = scheduledStart;
      booking.scheduledEnd = scheduledEnd;
      booking.status = "scheduled";
      booking.statusHistory.push({
        from: previous,
        to: "scheduled",
        changedBy: new mongoose.Types.ObjectId(actorId),
        changedAt: new Date(),
      });
      await booking.save({ session });
      await notify(
        {
          recipientId: String(booking.userId),
          type: "booking.scheduled",
          title: "Service scheduled",
          message: `${booking.bookingNumber} was scheduled.`,
          resourceType: "booking",
          resourceId: String(booking._id),
        },
        session,
      );
      return booking;
    });
  } finally {
    await session.endSession();
  }
}

export async function changeStatus(
  bookingId: string,
  next: BookingStatus,
  actor: { id: string; role: string },
  technicianNotes?: string,
) {
  const booking = await ServiceBookingModel.findById(bookingId);
  if (!booking)
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  if (
    actor.role === "technician" &&
    String(booking.technicianId) !== actor.id
  ) {
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  }
  if (next === "cancelled")
    throw new AppError(
      422,
      "USE_CANCEL_ENDPOINT",
      "Use the cancellation endpoint",
    );
  if (!TRANSITIONS[booking.status].includes(next)) {
    throw new AppError(
      409,
      "INVALID_BOOKING_TRANSITION",
      `Cannot move booking from ${booking.status} to ${next}`,
    );
  }
  if (
    actor.role === "technician" &&
    !(booking.status === "scheduled" && next === "in_progress") &&
    !(booking.status === "in_progress" && next === "completed")
  ) {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Technicians can only progress assigned operational work",
    );
  }
  const previous = booking.status;
  booking.status = next;
  if (technicianNotes !== undefined) booking.technicianNotes = technicianNotes;
  booking.statusHistory.push({
    from: previous,
    to: next,
    changedBy: new mongoose.Types.ObjectId(actor.id),
    changedAt: new Date(),
  });
  await booking.save();
  await notify({
    recipientId: String(booking.userId),
    type: "booking.status",
    title: "Service updated",
    message: `${booking.bookingNumber} is now ${next.replace("_", " ")}.`,
    resourceType: "booking",
    resourceId: String(booking._id),
  });
  return booking;
}

export async function cancelBooking(
  bookingId: string,
  actor: { id: string; role: string },
) {
  const booking = await ServiceBookingModel.findOne(
    actor.role === "admin"
      ? { _id: bookingId }
      : { _id: bookingId, userId: actor.id },
  );
  if (!booking)
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  if (
    !["requested", "confirmed", "assigned", "scheduled"].includes(
      booking.status,
    )
  ) {
    throw new AppError(
      409,
      "INVALID_BOOKING_TRANSITION",
      "This booking cannot be cancelled",
    );
  }
  const previous = booking.status;
  booking.status = "cancelled";
  booking.statusHistory.push({
    from: previous,
    to: "cancelled",
    changedBy: new mongoose.Types.ObjectId(actor.id),
    changedAt: new Date(),
  });
  await booking.save();
  await notify({
    recipientId: String(booking.userId),
    type: "booking.cancelled",
    title: "Service cancelled",
    message: `${booking.bookingNumber} was cancelled.`,
    resourceType: "booking",
    resourceId: String(booking._id),
  });
  return booking;
}
