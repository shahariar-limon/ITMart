import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./admin.controller.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));
adminRouter.get("/dashboard", asyncHandler(controller.dashboard));
