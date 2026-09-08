import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { queueCommunication } from "../communications/communication.service.js";
import { recordAudit } from "../audit/audit.service.js";
function actor(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user;
}
const include = {
  productItems: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
  services: { include: { service: { select: { id: true, name: true } } } },
} as const;
const serialize = <T extends { id: string }>(value: T) => {
  const { id, ...fields } = value;
  return { _id: id, ...fields };
};
export async function create(request: Request, response: Response) {
  const user = actor(request);
  const input = z
    .object({
      title: z.string().trim().min(3).max(160),
      requirements: z.string().trim().min(10).max(10000),
    })
    .strict()
    .parse(request.body);
  const solution = await prisma.solutionRequest.create({
    data: { userId: user.id, ...input },
    include,
  });
  response
    .status(201)
    .json({ success: true, data: { solution: serialize(solution) } });
}
export async function list(request: Request, response: Response) {
  const user = actor(request);
  const solutions = await prisma.solutionRequest.findMany({
    where: user.role === "admin" ? {} : { userId: user.id },
    include,
    orderBy: { createdAt: "desc" },
  });
  response.json({
    success: true,
    data: { solutions: solutions.map(serialize) },
  });
}
export async function quote(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.solutionId);
  const input = z
    .object({
      productItems: z
        .array(
          z.object({
            productId: objectIdSchema,
            quantity: z.number().int().min(1).max(999),
          }),
        )
        .max(50)
        .default([]),
      serviceIds: z.array(objectIdSchema).max(30).default([]),
      quotedPrice: z.number().int().nonnegative(),
      adminNotes: z.string().trim().max(3000).default(""),
      expiresAt: z.coerce.date(),
    })
    .strict()
    .parse(request.body);
  if (input.expiresAt <= new Date())
    throw new AppError(422, "INVALID_EXPIRY", "Expiry must be in the future");
  const productIds = [...new Set(input.productItems.map((x) => x.productId))];
  const serviceIds = [...new Set(input.serviceIds)];
  const [products, services] = await Promise.all([
    prisma.product.count({
      where: { id: { in: productIds }, status: "active" },
    }),
    prisma.service.count({ where: { id: { in: serviceIds }, isActive: true } }),
  ]);
  if (
    products !== productIds.length ||
    services !== serviceIds.length ||
    productIds.length !== input.productItems.length ||
    serviceIds.length !== input.serviceIds.length
  )
    throw new AppError(
      422,
      "INVALID_QUOTE_COMPONENT",
      "Quote components must be active and unique",
    );
  const solution = await prisma.$transaction(async (tx) => {
    const current = await tx.solutionRequest.findFirst({
      where: { id, status: { in: ["submitted", "quoted"] } },
    });
    if (!current)
      throw new AppError(
        409,
        "SOLUTION_NOT_QUOTABLE",
        "Solution request cannot be quoted",
      );
    await tx.solutionQuoteProduct.deleteMany({ where: { solutionId: id } });
    await tx.solutionQuoteService.deleteMany({ where: { solutionId: id } });
    const updated = await tx.solutionRequest.update({
      where: { id },
      data: {
        status: "quoted",
        quotedPrice: input.quotedPrice,
        adminNotes: input.adminNotes,
        expiresAt: input.expiresAt,
        productItems: { create: input.productItems },
        services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      },
      include,
    });
    await queueCommunication(tx, {
      recipientId: current.userId,
      type: "quote.ready",
      title: "Quotation ready",
      message: `A quotation for ${current.title} is ready.`,
      resourceType: "solution",
      resourceId: id,
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "solution.quoted",
      resourceType: "solution",
      resourceId: id,
      requestId: request.requestId,
    });
    return updated;
  });
  response.json({ success: true, data: { solution: serialize(solution) } });
}
export async function decide(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.solutionId);
  const input = z
    .discriminatedUnion("decision", [
      z.object({
        decision: z.literal("accept"),
        shippingAddress: z.string().trim().min(10).max(500),
      }),
      z.object({ decision: z.literal("reject") }),
    ])
    .parse(request.body);
  if (input.decision === "reject") {
    const result = await prisma.solutionRequest.updateMany({
      where: { id, userId: user.id, status: "quoted" },
      data: { status: "rejected" },
    });
    if (!result.count)
      throw new AppError(409, "QUOTE_UNAVAILABLE", "Quotation is unavailable");
    response.json({
      success: true,
      data: {
        solution: serialize(
          await prisma.solutionRequest.findUniqueOrThrow({
            where: { id },
            include,
          }),
        ),
      },
    });
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const solution = await tx.solutionRequest.findFirst({
      where: {
        id,
        userId: user.id,
        status: "quoted",
        expiresAt: { gt: new Date() },
      },
      include: {
        productItems: { include: { product: true } },
        services: { include: { service: true } },
      },
    });
    if (!solution || solution.quotedPrice === null)
      throw new AppError(
        409,
        "QUOTE_UNAVAILABLE",
        "Quotation is unavailable or expired",
      );
    for (const item of solution.productItems)
      if (
        !(
          await tx.product.updateMany({
            where: {
              id: item.productId,
              status: "active",
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })
        ).count
      )
        throw new AppError(
          409,
          "STOCK_CONFLICT",
          "A quoted product is unavailable",
        );
    const order = await tx.order.create({
      data: {
        orderNumber: `ITM-Q-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId: user.id,
        subtotal: solution.quotedPrice,
        discountTotal: 0,
        grandTotal: solution.quotedPrice,
        idempotencyKey: `quote-${id}`,
        shippingAddress: input.shippingAddress,
        items: {
          create: solution.productItems.map((item) => ({
            productId: item.productId,
            nameSnapshot: item.product.name,
            skuSnapshot: item.product.sku,
            quantity: item.quantity,
            unitPrice: 0,
            lineTotal: 0,
          })),
        },
        statusHistory: { create: { to: "pending", changedBy: user.id } },
      },
    });
    for (const item of solution.services)
      await tx.serviceBooking.create({
        data: {
          bookingNumber: `SRV-Q-${randomUUID().slice(0, 8).toUpperCase()}`,
          userId: user.id,
          serviceId: item.serviceId,
          serviceNameSnapshot: item.service.name,
          basePriceSnapshot: 0,
          durationMinutesSnapshot: item.service.durationMinutes,
          address: input.shippingAddress,
          customerNotes: `Created from solution request ${solution.title}`,
          statusHistory: { create: { to: "requested", changedBy: user.id } },
        },
      });
    const updated = await tx.solutionRequest.update({
      where: { id },
      data: { status: "accepted", orderId: order.id },
    });
    await queueCommunication(tx, {
      recipientId: user.id,
      type: "quote.accepted",
      title: "Quotation accepted",
      message: "Your solution order was created.",
      resourceType: "order",
      resourceId: order.id,
    });
    return { solution: serialize(updated), order: serialize(order) };
  });
  response.json({ success: true, data: result });
}
