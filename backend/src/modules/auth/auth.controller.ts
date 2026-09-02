import type { Request, Response } from "express";
import { AppError } from "../../shared/app-error.js";
import * as authService from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export async function register(
  request: Request,
  response: Response,
): Promise<void> {
  const result = await authService.register(registerSchema.parse(request.body));
  response.status(201).json({ success: true, data: result });
}

export async function login(
  request: Request,
  response: Response,
): Promise<void> {
  const result = await authService.login(loginSchema.parse(request.body));
  response.json({ success: true, data: result });
}

export async function me(request: Request, response: Response): Promise<void> {
  if (!request.user) {
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  }
  const user = await authService.getCurrentUser(request.user.id);
  response.json({ success: true, data: { user } });
}
