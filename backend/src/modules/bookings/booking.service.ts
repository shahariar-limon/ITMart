import { randomUUID } from "node:crypto";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { recordAudit } from "../audit/audit.service.js";
import { queueCommunication } from "../communications/communication.service.js";

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["assigned", "cancelled"],
  assigned: ["scheduled", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};
export const bookingInclude = {
  technician: { select: { id: true, name: true, email: true, role: true } },
  statusHistory: { orderBy: { changedAt: "asc" as const } },
} as const;
export const serializeBooking = <
  T extends { id: string; technician?: { id: string } | null },
>(
  booking: T,
) => {
  const { id, technician, ...fields } = booking;
  return {
    _id: id,
    ...fields,
    technicianId: technician ? { _id: technician.id, ...technician } : null,
  };
};
const bookingNumber = () =>
  `SRV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;

export async function createBooking(
  userId: string,
  input: {
    serviceId: string;
    preferredStart?: Date | undefined;
    address: string;
    customerNotes: string;
  },
  requestId?: string,
) {
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, isActive: true },
  });
  if (!service)
    throw new AppError(404, "SERVICE_NOT_FOUND", "Service was not found");
  if (input.preferredStart && input.preferredStart <= new Date())
    throw new AppError(
      422,
      "INVALID_PREFERRED_TIME",
      "Preferred time must be in the future",
    );
  return prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.create({
      data: {
        bookingNumber: bookingNumber(),
        userId,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        basePriceSnapshot: service.basePrice,
        durationMinutesSnapshot: service.durationMinutes,
        ...(input.preferredStart ? { preferredStart: input.preferredStart } : {}),
        address: input.address,
        customerNotes: input.customerNotes,
        statusHistory: { create: { to: "requested", changedBy: userId } },
      },
      include: bookingInclude,
    });
    await recordAudit(tx, {
      actorId: userId,
      action: "booking.created",
      resourceType: "booking",
      resourceId: booking.id,
      requestId,
    });
    await queueCommunication(tx, {
      recipientId: userId,
      type: "booking.requested",
      title: "Service requested",
      message: `Request ${booking.bookingNumber} was submitted.`,
      resourceType: "booking",
      resourceId: booking.id,
    });
    return booking;
  });
}
export async function assignTechnician(
  bookingId: string,
  technicianId: string,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const technician = await tx.user.findFirst({
      where: { id: technicianId, role: "technician", isActive: true },
    });
    if (!technician)
      throw new AppError(
        422,
        "INVALID_TECHNICIAN",
        "An active technician is required",
      );
    const booking = await tx.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking)
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    if (!["confirmed", "assigned"].includes(booking.status))
      throw new AppError(
        409,
        "INVALID_BOOKING_TRANSITION",
        "Only a confirmed booking can be assigned",
      );
    const updated = await tx.serviceBooking.update({
      where: { id: bookingId },
      data: {
        technicianId,
        status: "assigned",
        statusHistory: {
          create: { from: booking.status, to: "assigned", changedBy: actorId },
        },
      },
      include: bookingInclude,
    });
    await queueCommunication(tx, {
      recipientId: booking.userId,
      type: "booking.assigned",
      title: "Technician assigned",
      message: `A technician was assigned to ${booking.bookingNumber}.`,
      resourceType: "booking",
      resourceId: bookingId,
    });
    await queueCommunication(tx, {
      recipientId: technicianId,
      type: "booking.assigned",
      title: "New assignment",
      message: `You were assigned ${booking.bookingNumber}.`,
      resourceType: "booking",
      resourceId: bookingId,
    });
    return updated;
  });
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
  return prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (
      !booking?.technicianId ||
      !["assigned", "scheduled"].includes(booking.status)
    )
      throw new AppError(
        409,
        "INVALID_BOOKING_TRANSITION",
        "Booking must be assigned before scheduling",
      );
    // Serialize scheduling per technician so concurrent schedule requests
    // cannot both pass the overlap check (prevents technician double-booking).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.technicianId}))`;
    const scheduledEnd = new Date(
      scheduledStart.getTime() + booking.durationMinutesSnapshot * 60000,
    );
    const conflict = await tx.serviceBooking.findFirst({
      where: {
        id: { not: bookingId },
        technicianId: booking.technicianId,
        status: { in: ["scheduled", "in_progress"] },
        scheduledStart: { lt: scheduledEnd },
        scheduledEnd: { gt: scheduledStart },
      },
    });
    if (conflict)
      throw new AppError(
        409,
        "TECHNICIAN_UNAVAILABLE",
        "Technician already has an overlapping booking",
      );
    const updated = await tx.serviceBooking.update({
      where: { id: bookingId },
      data: {
        scheduledStart,
        scheduledEnd,
        status: "scheduled",
        statusHistory: {
          create: { from: booking.status, to: "scheduled", changedBy: actorId },
        },
      },
      include: bookingInclude,
    });
    await queueCommunication(tx, {
      recipientId: booking.userId,
      type: "booking.scheduled",
      title: "Service scheduled",
      message: `${booking.bookingNumber} was scheduled.`,
      resourceType: "booking",
      resourceId: bookingId,
    });
    return updated;
  });
}
export async function changeStatus(
  bookingId: string,
  next: BookingStatus,
  actor: { id: string; role: string },
  technicianNotes?: string,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findUnique({
      where: { id: bookingId },
    });
    if (
      !booking ||
      (actor.role === "technician" && booking.technicianId !== actor.id)
    )
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    if (next === "cancelled")
      throw new AppError(
        422,
        "USE_CANCEL_ENDPOINT",
        "Use the cancellation endpoint",
      );
    if (!TRANSITIONS[booking.status].includes(next))
      throw new AppError(
        409,
        "INVALID_BOOKING_TRANSITION",
        `Cannot move booking from ${booking.status} to ${next}`,
      );
    if (
      actor.role === "technician" &&
      !(
        (booking.status === "scheduled" && next === "in_progress") ||
        (booking.status === "in_progress" && next === "completed")
      )
    )
      throw new AppError(
        403,
        "FORBIDDEN",
        "Technicians can only progress assigned operational work",
      );
    const updated = await tx.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: next,
        ...(technicianNotes === undefined ? {} : { technicianNotes }),
        statusHistory: {
          create: { from: booking.status, to: next, changedBy: actor.id },
        },
      },
      include: bookingInclude,
    });
    await queueCommunication(tx, {
      recipientId: booking.userId,
      type: "booking.status",
      title: "Service updated",
      message: `${booking.bookingNumber} is now ${next.replace("_", " ")}.`,
      resourceType: "booking",
      resourceId: bookingId,
    });
    return updated;
  });
}
export async function cancelBooking(
  bookingId: string,
  actor: { id: string; role: string },
) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({
      where: {
        id: bookingId,
        ...(actor.role === "admin" ? {} : { userId: actor.id }),
      },
    });
    if (!booking)
      throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
    if (
      !["requested", "confirmed", "assigned", "scheduled"].includes(
        booking.status,
      )
    )
      throw new AppError(
        409,
        "INVALID_BOOKING_TRANSITION",
        "This booking cannot be cancelled",
      );
    const updated = await tx.serviceBooking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        statusHistory: {
          create: {
            from: booking.status,
            to: "cancelled",
            changedBy: actor.id,
          },
        },
      },
      include: bookingInclude,
    });
    await queueCommunication(tx, {
      recipientId: booking.userId,
      type: "booking.cancelled",
      title: "Service cancelled",
      message: `${booking.bookingNumber} was cancelled.`,
      resourceType: "booking",
      resourceId: bookingId,
    });
    return updated;
  });
}
