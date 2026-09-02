import { Router } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import * as controller from "./search.controller.js";
export const searchRouter = Router();
searchRouter.post("/assist", asyncHandler(controller.assist));
