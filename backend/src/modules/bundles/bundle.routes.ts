import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./bundle.controller.js";
export const bundleRouter = Router();
bundleRouter.get("/", asyncHandler(controller.list));
bundleRouter.get("/:bundleId", asyncHandler(controller.detail));
bundleRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.create),
);
bundleRouter.patch(
  "/:bundleId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.update),
);
bundleRouter.delete(
  "/:bundleId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.archive),
);
