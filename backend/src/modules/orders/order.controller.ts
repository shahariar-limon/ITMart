import type { FilterQuery } from "mongoose";
import type { Request, Response } from "express";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { OrderModel, type Order } from "./order.model.js";
import * as orderService from "./order.service.js";
import {
  checkoutSchema,
  orderListSchema,
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

export async function create(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const input = checkoutSchema.parse(request.body);
  const order = await orderService.checkout(
    user.id,
    input.shippingAddress,
    input.paymentMethod,
  );
  response.status(201).json({ success: true, data: { order } });
}

export async function list(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const query = orderListSchema.parse(request.query);
  const filter: FilterQuery<Order> =
    user.role === "admin" ? {} : { userId: user.id };
  if (query.status) filter.status = query.status;
  const [orders, totalItems] = await Promise.all([
    OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);
  response.json({
    success: true,
    data: { orders },
    meta: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / query.limit),
    },
  });
}

export async function detail(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const order = await OrderModel.findOne(
    user.role === "admin" ? { _id: id } : { _id: id, userId: user.id },
  ).lean();
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  response.json({ success: true, data: { order } });
}

export async function updateStatus(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const input = updateOrderStatusSchema.parse(request.body);
  const order = await orderService.changeStatus(id, input.status, user.id);
  response.json({ success: true, data: { order } });
}

export async function cancel(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.orderId);
  const owned = await OrderModel.exists(
    user.role === "admin" ? { _id: id } : { _id: id, userId: user.id },
  );
  if (!owned) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  const order = await orderService.cancel(id, user.id);
  response.json({ success: true, data: { order } });
}
