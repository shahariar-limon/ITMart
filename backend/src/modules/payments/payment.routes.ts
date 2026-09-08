import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import * as controller from "./payment.controller.js";

export const paymentRouter = Router();
paymentRouter.get("/bkash/callback", asyncHandler(controller.bkashCallback));
