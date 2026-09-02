import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "../shared/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  let normalized = error;

  if (error instanceof ZodError) {
    normalized = new AppError(
      422,
      "VALIDATION_ERROR",
      "Request validation failed",
      error.issues,
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    normalized = new AppError(
      422,
      "INVALID_IDENTIFIER",
      "A supplied identifier is invalid",
    );
  }

  if (normalized instanceof AppError) {
    response.status(normalized.statusCode).json({
      success: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details === undefined
          ? {}
          : { details: normalized.details }),
      },
      requestId: request.requestId,
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error(`[${request.requestId}]`, error);
  }

  response.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
    requestId: request.requestId,
  });
};
