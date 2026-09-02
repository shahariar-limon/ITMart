import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import * as controller from "./notification.controller.js";
export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", asyncHandler(controller.list));
notificationRouter.patch(
  "/:notificationId/read",
  asyncHandler(controller.markRead),
);
notificationRouter.post("/read-all", asyncHandler(controller.markAllRead));
