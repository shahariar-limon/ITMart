import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/app-error.js";
import { USER_ROLES, type UserRole } from "../users/user.model.js";

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(
      new AppError(
        401,
        "AUTHENTICATION_REQUIRED",
        "A valid access token is required",
      ),
    );
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: "itmart-api",
      audience: "itmart-web",
    });
    const payload = tokenPayloadSchema.parse(decoded);
    request.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(
      new AppError(
        401,
        "INVALID_TOKEN",
        "The access token is invalid or expired",
      ),
    );
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(
        new AppError(
          401,
          "AUTHENTICATION_REQUIRED",
          "Authentication is required",
        ),
      );
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action",
        ),
      );
      return;
    }
    next();
  };
}
