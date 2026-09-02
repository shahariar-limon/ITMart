import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import * as controller from "./wishlist.controller.js";
export const wishlistRouter = Router();
wishlistRouter.use(requireAuth, requireRole("customer"));
wishlistRouter.get("/", asyncHandler(controller.get));
wishlistRouter.post("/items", asyncHandler(controller.add));
wishlistRouter.delete("/items/:productId", asyncHandler(controller.remove));
