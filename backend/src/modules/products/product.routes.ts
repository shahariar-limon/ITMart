import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./product.controller.js";

export const productRouter = Router();
productRouter.get("/", asyncHandler(controller.list));
productRouter.get("/:productId", asyncHandler(controller.detail));
productRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.create),
);
productRouter.patch(
  "/:productId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.update),
);
productRouter.delete(
  "/:productId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.archive),
);
