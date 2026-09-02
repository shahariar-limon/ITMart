import { Router } from "express";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/async-handler.js";
import * as controller from "./category.controller.js";

export const categoryRouter = Router();
categoryRouter.get("/", asyncHandler(controller.list));
categoryRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.create),
);
categoryRouter.patch(
  "/:categoryId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(controller.update),
);
