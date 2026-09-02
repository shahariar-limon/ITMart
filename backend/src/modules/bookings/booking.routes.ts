import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./booking.controller.js";

export const bookingRouter = Router();
bookingRouter.use(requireAuth);
bookingRouter.post(
  "/",
  requireRole("customer"),
  asyncHandler(controller.create),
);
bookingRouter.get(
  "/",
  requireRole("customer", "technician", "admin"),
  asyncHandler(controller.list),
);
bookingRouter.get(
  "/:bookingId",
  requireRole("customer", "technician", "admin"),
  asyncHandler(controller.detail),
);
bookingRouter.patch(
  "/:bookingId/assignment",
  requireRole("admin"),
  asyncHandler(controller.assign),
);
bookingRouter.patch(
  "/:bookingId/schedule",
  requireRole("admin"),
  asyncHandler(controller.schedule),
);
bookingRouter.patch(
  "/:bookingId/status",
  requireRole("admin", "technician"),
  asyncHandler(controller.updateStatus),
);
bookingRouter.post(
  "/:bookingId/cancel",
  requireRole("customer", "admin"),
  asyncHandler(controller.cancel),
);
