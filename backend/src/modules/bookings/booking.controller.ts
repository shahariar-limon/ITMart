import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import * as service from "./booking.service.js";
import {
  assignBookingSchema,
  bookingListSchema,
  createBookingSchema,
  scheduleBookingSchema,
  updateBookingStatusSchema,
} from "./booking.validation.js";
function actor(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user;
}
function scope(user: { id: string; role: string }) {
  return user.role === "admin"
    ? {}
    : user.role === "technician"
      ? { technicianId: user.id }
      : { userId: user.id };
}
export async function create(request: Request, response: Response) {
  const user = actor(request);
  const booking = await service.createBooking(
    user.id,
    createBookingSchema.parse(request.body),
    request.requestId,
  );
  response
    .status(201)
    .json({
      success: true,
      data: { booking: service.serializeBooking(booking) },
    });
}
export async function list(request: Request, response: Response) {
  const user = actor(request);
  const query = bookingListSchema.parse(request.query);
  const where = {
    ...scope(user),
    ...(query.status ? { status: query.status } : {}),
  };
  const [bookings, totalItems] = await Promise.all([
    prisma.serviceBooking.findMany({
      where,
      include: service.bookingInclude,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.serviceBooking.count({ where }),
  ]);
  response.json({
    success: true,
    data: { bookings: bookings.map(service.serializeBooking) },
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    },
  });
}
export async function detail(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const booking = await prisma.serviceBooking.findFirst({
    where: { id, ...scope(user) },
    include: service.bookingInclude,
  });
  if (!booking)
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  response.json({
    success: true,
    data: { booking: service.serializeBooking(booking) },
  });
}
export async function assign(request: Request, response: Response) {
  const user = actor(request);
  const booking = await service.assignTechnician(
    objectIdSchema.parse(request.params.bookingId),
    assignBookingSchema.parse(request.body).technicianId,
    user.id,
  );
  response.json({
    success: true,
    data: { booking: service.serializeBooking(booking) },
  });
}
export async function schedule(request: Request, response: Response) {
  const user = actor(request);
  const booking = await service.scheduleBooking(
    objectIdSchema.parse(request.params.bookingId),
    scheduleBookingSchema.parse(request.body).scheduledStart,
    user.id,
  );
  response.json({
    success: true,
    data: { booking: service.serializeBooking(booking) },
  });
}
export async function updateStatus(request: Request, response: Response) {
  const user = actor(request);
  const input = updateBookingStatusSchema.parse(request.body);
  const booking = await service.changeStatus(
    objectIdSchema.parse(request.params.bookingId),
    input.status,
    user,
    input.technicianNotes,
  );
  response.json({
    success: true,
    data: { booking: service.serializeBooking(booking) },
  });
}
export async function cancel(request: Request, response: Response) {
  const booking = await service.cancelBooking(
    objectIdSchema.parse(request.params.bookingId),
    actor(request),
  );
  response.json({
    success: true,
    data: { booking: service.serializeBooking(booking) },
  });
}
