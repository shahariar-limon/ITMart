import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../shared/async-handler.js";
import * as controller from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts; try again later",
    },
  },
});

authRouter.post("/register", authLimiter, asyncHandler(controller.register));
authRouter.post("/login", authLimiter, asyncHandler(controller.login));
authRouter.get("/me", requireAuth, asyncHandler(controller.me));
