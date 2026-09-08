import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { cancel } from "../orders/order.service.js";
import { executeBkashPayment } from "./payment.service.js";
import { fromBkashAmount } from "./payment-amount.js";

const callbackSchema = z.object({
  paymentID: z.string().min(1),
  status: z.enum(["success", "failure", "cancel"]),
});

function redirect(response: Response, result: string, orderNumber?: string) {
  const url = new URL("/payment-result", env.CORS_ORIGIN);
  url.searchParams.set("payment", result);
  if (orderNumber) url.searchParams.set("order", orderNumber);
  response.redirect(303, url.toString());
}

export async function bkashCallback(request: Request, response: Response) {
  const input = callbackSchema.parse(request.query);
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { providerReference: input.paymentID },
    include: { order: true },
  });
  if (!attempt || attempt.provider !== "bkash")
    throw new AppError(404, "PAYMENT_NOT_FOUND", "Payment was not found");

  if (attempt.status === "paid") {
    redirect(response, "success", attempt.order.orderNumber);
    return;
  }

  if (input.status !== "success") {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "failed" },
    });
    if (["pending", "confirmed"].includes(attempt.order.status))
      await cancel(
        attempt.orderId,
        attempt.order.userId,
        input.status === "cancel"
          ? "bKash payment cancelled"
          : "bKash payment failed",
        request.requestId,
      );
    redirect(response, input.status, attempt.order.orderNumber);
    return;
  }

  const execution = await executeBkashPayment(input.paymentID);
  const transactionStatus = String(
    execution.transactionStatus ?? "",
  ).toLowerCase();
  const providerAmount = fromBkashAmount(execution.amount);
  const providerPaymentId = String(execution.paymentID ?? "");
  const providerInvoice = String(execution.merchantInvoiceNumber ?? "");
  if (
    transactionStatus !== "completed" ||
    providerPaymentId !== input.paymentID ||
    providerAmount !== attempt.amount ||
    (providerInvoice && providerInvoice !== attempt.order.orderNumber)
  ) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "failed",
        metadata: JSON.parse(JSON.stringify({ executeResponse: execution })),
      },
    });
    throw new AppError(
      502,
      "BKASH_VERIFICATION_FAILED",
      "bKash payment verification failed",
    );
  }

  await prisma.$transaction([
    prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "paid",
        metadata: JSON.parse(JSON.stringify({ executeResponse: execution })),
      },
    }),
    prisma.order.update({
      where: { id: attempt.orderId },
      data: {
        paymentStatus: "paid",
        paymentReference: String(execution.trxID ?? input.paymentID),
      },
    }),
  ]);
  redirect(response, "success", attempt.order.orderNumber);
}
