import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./user.controller.js";

export const userRouter = Router();
userRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.listUsers),
);
userRouter.patch(
  "/:userId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.updateUser),
);
userRouter.get(
  "/technicians",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.listTechnicians),
);
userRouter.patch(
  "/:userId/business-account",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.updateBusinessAccount),
);
