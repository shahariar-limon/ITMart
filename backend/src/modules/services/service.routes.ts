import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./service.controller.js";

export const serviceRouter = Router();
serviceRouter.get("/", asyncHandler(controller.list));
serviceRouter.get("/:serviceId", asyncHandler(controller.detail));
serviceRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.create),
);
serviceRouter.patch(
  "/:serviceId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.update),
);
