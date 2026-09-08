import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./support.controller.js";
export const supportRouter = Router(); supportRouter.use(requireAuth); supportRouter.get("/", requireRole("customer", "admin"), asyncHandler(controller.list)); supportRouter.post("/", requireRole("customer"), asyncHandler(controller.create)); supportRouter.get("/:ticketId", requireRole("customer", "admin"), asyncHandler(controller.detail)); supportRouter.patch("/:ticketId", requireRole("admin"), asyncHandler(controller.update)); supportRouter.post("/:ticketId/replies", requireRole("customer", "admin"), asyncHandler(controller.reply));
