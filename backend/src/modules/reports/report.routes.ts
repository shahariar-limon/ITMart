import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./report.controller.js";
export const reportRouter = Router();
reportRouter.use(requireAuth, requireRole("admin"));
reportRouter.get("/summary", asyncHandler(controller.summary));
reportRouter.get("/sales.csv", asyncHandler(controller.salesCsv));
reportRouter.get("/services.csv", asyncHandler(controller.servicesCsv));
