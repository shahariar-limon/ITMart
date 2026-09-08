import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import * as orderService from "./order.service.js";
import {
  cancelOrderSchema,
  checkoutSchema,
  orderListSchema,
  returnRequestSchema,
  updateOrderStatusSchema,
} from "./order.validation.js";
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
  items: true,
  bundleItems: { include: { services: true } },
  statusHistory: { orderBy: { changedAt: "asc" as const } },
  paymentAttempts: true,
  returnRequests: true,
} as const;
export async function create(request: Request, response: Response) {
  const user = actor(request);
  const input = checkoutSchema.parse(request.body);
  const result = await orderService.checkout({
    userId: user.id,
    ...input,
    requestId: request.requestId,
  });
  response
    .status(result.replayed ? 200 : 201)
    .json({
      success: true,
      data: {
        order: orderService.serializeOrder(result.order),
        replayed: result.replayed,
        ...(result.paymentUrl ? { paymentUrl: result.paymentUrl } : {}),
      },
    });
}
export async function list(request: Request, response: Response) {
  const user = actor(request);
  const query = orderListSchema.parse(request.query);
  const where = {
    ...(user.role === "admin" ? {} : { userId: user.id }),
    ...(query.status ? { status: query.status } : {}),
  };
  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include,
    }),
    prisma.order.count({ where }),
  ]);
  response.json({
    success: true,
    data: { orders: orders.map(orderService.serializeOrder) },
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    },
  });
}
export async function detail(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const order = await prisma.order.findFirst({
    where: { id, ...(user.role === "admin" ? {} : { userId: user.id }) },
    include,
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  response.json({
    success: true,
    data: { order: orderService.serializeOrder(order) },
  });
}
export async function updateStatus(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const { status, ...fulfilment } = updateOrderStatusSchema.parse(request.body);
  const order = await orderService.changeStatus(
    id,
    status,
    user.id,
    fulfilment,
    request.requestId,
  );
  response.json({
    success: true,
    data: { order: orderService.serializeOrder(order) },
  });
}
export async function cancel(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const owned = await prisma.order.findFirst({
    where: { id, ...(user.role === "admin" ? {} : { userId: user.id }) },
    select: { id: true },
  });
  if (!owned) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  const { reason } = cancelOrderSchema.parse(request.body ?? {});
  const order = await orderService.cancel(
    id,
    user.id,
    reason,
    request.requestId,
  );
  response.json({
    success: true,
    data: { order: orderService.serializeOrder(order) },
  });
}
export async function requestReturn(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const { reason } = returnRequestSchema.parse(request.body);
  const item = await orderService.requestReturn(
    id,
    user.id,
    reason,
    request.requestId,
  );
  response
    .status(201)
    .json({
      success: true,
      data: { returnRequest: { _id: item.id, ...item } },
    });
}
export async function invoice(request: Request, response: Response) {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const order = await prisma.order.findFirst({
    where: { id, ...(user.role === "admin" ? {} : { userId: user.id }) },
    include: { items: true },
  });
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  response
    .type("text/plain")
    .setHeader(
      "Content-Disposition",
      `attachment; filename=${order.orderNumber}.txt`,
    );
  response.send(
    [
      `ITMart invoice ${order.orderNumber}`,
      `Date: ${order.createdAt.toISOString()}`,
      ...order.items.map(
        (item) =>
          `${item.quantity} x ${item.nameSnapshot}: BDT ${item.lineTotal}`,
      ),
      `Delivery: BDT ${order.deliveryFee}`,
      `Total: BDT ${order.grandTotal}`,
      `Payment: ${order.paymentStatus}`,
    ].join("\n"),
  );
}
