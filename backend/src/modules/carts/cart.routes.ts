import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./cart.controller.js";

export const cartRouter = Router();
cartRouter.use(requireAuth, requireRole("customer"));
cartRouter.get("/", asyncHandler(controller.get));
cartRouter.post("/items", asyncHandler(controller.add));
cartRouter.patch("/items/:productId", asyncHandler(controller.update));
cartRouter.delete("/items/:productId", asyncHandler(controller.remove));
cartRouter.post("/bundles", asyncHandler(controller.addBundle));
cartRouter.patch("/bundles/:bundleId", asyncHandler(controller.updateBundle));
cartRouter.delete("/bundles/:bundleId", asyncHandler(controller.removeBundle));
