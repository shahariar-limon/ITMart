import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./order.controller.js";

export const orderRouter = Router();
orderRouter.use(requireAuth);
orderRouter.post("/", requireRole("customer"), asyncHandler(controller.create));
orderRouter.get(
  "/",
  requireRole("customer", "admin"),
  asyncHandler(controller.list),
);
orderRouter.get(
  "/:orderId",
  requireRole("customer", "admin"),
  asyncHandler(controller.detail),
);
orderRouter.patch(
  "/:orderId/status",
  requireRole("admin"),
  asyncHandler(controller.updateStatus),
);
orderRouter.post(
  "/:orderId/cancel",
  requireRole("customer", "admin"),
  asyncHandler(controller.cancel),
);
