import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./review.controller.js";

export const reviewRouter = Router();
reviewRouter.get("/products/:productId/reviews", asyncHandler(controller.list));
reviewRouter.post(
  "/products/:productId/reviews",
  requireAuth,
  requireRole("customer"),
  asyncHandler(controller.create),
);
reviewRouter.patch(
  "/reviews/:reviewId",
  requireAuth,
  requireRole("customer"),
  asyncHandler(controller.update),
);
reviewRouter.delete(
  "/reviews/:reviewId",
  requireAuth,
  requireRole("customer"),
  asyncHandler(controller.remove),
);
