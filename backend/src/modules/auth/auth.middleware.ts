import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { USER_ROLES, type UserRole } from "../users/user.model.js";

const tokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(USER_ROLES),
});

export const requireAuth: RequestHandler = async (request, _response, next) => {
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

  let payload: z.infer<typeof tokenPayloadSchema>;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: "itmart-api",
      audience: "itmart-web",
    });
    payload = tokenPayloadSchema.parse(decoded);
  } catch {
    next(
      new AppError(
        401,
        "INVALID_TOKEN",
        "The access token is invalid or expired",
      ),
    );
    return;
  }
  try {
    // Read current access so disabling or changing a user's role takes effect
    // for already-issued tokens as well as their next login.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true },
    });
    if (!user?.isActive) {
      next(
        new AppError(
          401,
          "ACCOUNT_INACTIVE",
          "This account is unavailable. Please sign in again.",
        ),
      );
      return;
    }
    request.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
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
