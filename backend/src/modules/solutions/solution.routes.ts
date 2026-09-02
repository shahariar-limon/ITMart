import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./solution.controller.js";
export const solutionRouter = Router();
solutionRouter.use(requireAuth);
solutionRouter.post(
  "/",
  requireRole("customer"),
  asyncHandler(controller.create),
);
solutionRouter.get(
  "/",
  requireRole("customer", "admin"),
  asyncHandler(controller.list),
);
solutionRouter.patch(
  "/:solutionId/quote",
  requireRole("admin"),
  asyncHandler(controller.quote),
);
solutionRouter.post(
  "/:solutionId/decision",
  requireRole("customer"),
  asyncHandler(controller.decide),
);
