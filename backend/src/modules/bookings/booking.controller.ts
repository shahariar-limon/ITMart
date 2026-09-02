import type { FilterQuery } from "mongoose";
import type { Request, Response } from "express";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { ServiceBookingModel, type ServiceBooking } from "./booking.model.js";
import * as bookingService from "./booking.service.js";
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

function scope(user: {
  id: string;
  role: string;
}): FilterQuery<ServiceBooking> {
  if (user.role === "admin") return {};
  if (user.role === "technician") return { technicianId: user.id };
  return { userId: user.id };
}

export async function create(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const input = createBookingSchema.parse(request.body);
  const booking = await bookingService.createBooking(user.id, input);
  response.status(201).json({ success: true, data: { booking } });
}

export async function list(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const query = bookingListSchema.parse(request.query);
  const filter = scope(user);
  if (query.status) filter.status = query.status;
  const [bookings, totalItems] = await Promise.all([
    ServiceBookingModel.find(filter)
      .populate({ path: "technicianId", select: "name email role" })
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ServiceBookingModel.countDocuments(filter),
  ]);
  response.json({
    success: true,
    data: { bookings },
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    },
  });
}

export async function detail(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const booking = await ServiceBookingModel.findOne({ _id: id, ...scope(user) })
    .populate({ path: "technicianId", select: "name email role" })
    .lean();
  if (!booking)
    throw new AppError(404, "BOOKING_NOT_FOUND", "Booking was not found");
  response.json({ success: true, data: { booking } });
}

export async function assign(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const input = assignBookingSchema.parse(request.body);
  const booking = await bookingService.assignTechnician(
    id,
    input.technicianId,
    user.id,
  );
  response.json({ success: true, data: { booking } });
}

export async function schedule(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const input = scheduleBookingSchema.parse(request.body);
  const booking = await bookingService.scheduleBooking(
    id,
    input.scheduledStart,
    user.id,
  );
  response.json({ success: true, data: { booking } });
}

export async function updateStatus(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const input = updateBookingStatusSchema.parse(request.body);
  const booking = await bookingService.changeStatus(
    id,
    input.status,
    user,
    input.technicianNotes,
  );
  response.json({ success: true, data: { booking } });
}

export async function cancel(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.bookingId);
  const booking = await bookingService.cancelBooking(id, user);
  response.json({ success: true, data: { booking } });
}
