import { randomUUID } from "node:crypto";
import {
  Prisma,
  type DeliveryMethod,
  type OrderStatus,
  type PaymentMethod,
} from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { recordAudit } from "../audit/audit.service.js";
import { queueCommunication } from "../communications/communication.service.js";
import {
  authorizePayment,
  createBkashPayment,
} from "../payments/payment.service.js";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};
const DELIVERY_FEES: Record<DeliveryMethod, number> = {
  standard: 8000,
  express: 18000,
  pickup: 0,
};
const orderInclude = {
  items: true,
  bundleItems: { include: { services: true } },
  statusHistory: { orderBy: { changedAt: "asc" as const } },
  paymentAttempts: true,
  returnRequests: true,
} as const;
const number = () =>
  `ITM-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
const bookingNumber = () =>
  `SRV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
export function serializeOrder<T extends { id: string }>(order: T) {
  const { id, ...fields } = order;
  return { _id: id, ...fields };
}

type OrderWithIncludes = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export async function checkout(input: {
  userId: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  idempotencyKey: string;
  requestId?: string;
}) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: orderInclude,
  });
  if (existing) {
    if (existing.userId !== input.userId)
      throw new AppError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "This checkout key is already in use",
      );
    const attempt = existing.paymentAttempts.find(
      (item) => item.provider === "bkash",
    );
    const metadata = attempt?.metadata as { paymentUrl?: unknown } | undefined;
    return {
      order: existing,
      replayed: true,
      paymentUrl:
        typeof metadata?.paymentUrl === "string" ? metadata.paymentUrl : undefined,
    };
  }
  let order: OrderWithIncludes;
  try {
    order = await prisma.$transaction(
      async (tx) => {
        const cart = await tx.cart.findUnique({
        where: { userId: input.userId },
        include: {
          items: { include: { product: true } },
          bundleItems: {
            include: {
              bundle: {
                include: {
                  productItems: { include: { product: true } },
                  services: { include: { service: true } },
                },
              },
            },
          },
        },
      });
      if (!cart || (!cart.items.length && !cart.bundleItems.length))
        throw new AppError(422, "EMPTY_CART", "The cart is empty");
      if (
        cart.bundleItems.some(
          (item) =>
            !item.bundle.isActive ||
            item.bundle.services.some(({ service }) => !service.isActive),
        )
      )
        throw new AppError(
          409,
          "BUNDLE_UNAVAILABLE",
          "One or more bundles are no longer available",
        );
      const customer = await tx.user.findUnique({
        where: { id: input.userId },
        select: { accountType: true, businessDiscountBps: true },
      });
      const demand = new Map<string, number>();
      for (const item of cart.items)
        demand.set(
          item.productId,
          (demand.get(item.productId) ?? 0) + item.quantity,
        );
      for (const item of cart.bundleItems)
        for (const component of item.bundle.productItems)
          demand.set(
            component.productId,
            (demand.get(component.productId) ?? 0) +
              component.quantity * item.quantity,
          );
      for (const [productId, quantity] of demand) {
        const changed = await tx.product.updateMany({
          where: { id: productId, status: "active", stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (!changed.count)
          throw new AppError(
            409,
            "STOCK_CONFLICT",
            "One or more items are no longer available",
          );
      }
      let subtotal = 0;
      let discountTotal = 0;
      const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      const bundles: Prisma.OrderBundleItemCreateWithoutOrderInput[] = [];
      for (const item of cart.items) {
        const businessDiscount =
          customer?.accountType === "business" && item.quantity >= 10
            ? Math.round(
                ((item.product.price - item.product.discount) *
                  customer.businessDiscountBps) /
                  10_000,
              )
            : 0;
        const unitPrice =
          item.product.price - item.product.discount - businessDiscount;
        subtotal += item.product.price * item.quantity;
        discountTotal +=
          (item.product.discount + businessDiscount) * item.quantity;
        items.push({
          product: { connect: { id: item.productId } },
          nameSnapshot: item.product.name,
          skuSnapshot: item.product.sku,
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
        });
      }
      for (const cartBundle of cart.bundleItems) {
        const bundle = cartBundle.bundle;
        subtotal += bundle.bundlePrice * cartBundle.quantity;
        bundles.push({
          bundle: { connect: { id: bundle.id } },
          nameSnapshot: bundle.name,
          quantity: cartBundle.quantity,
          unitPrice: bundle.bundlePrice,
          lineTotal: bundle.bundlePrice * cartBundle.quantity,
          services: {
            create: bundle.services.map(({ serviceId }) => ({
              service: { connect: { id: serviceId } },
            })),
          },
        });
        for (const component of bundle.productItems)
          items.push({
            product: { connect: { id: component.productId } },
            sourceBundle: { connect: { id: bundle.id } },
            nameSnapshot: component.product.name,
            skuSnapshot: component.product.sku,
            quantity: component.quantity * cartBundle.quantity,
            unitPrice: 0,
            lineTotal: 0,
          });
        for (let i = 0; i < cartBundle.quantity; i += 1)
          for (const { service } of bundle.services)
            await tx.serviceBooking.create({
              data: {
                bookingNumber: bookingNumber(),
                customer: { connect: { id: input.userId } },
                service: { connect: { id: service.id } },
                serviceNameSnapshot: service.name,
                basePriceSnapshot: 0,
                durationMinutesSnapshot: service.durationMinutes,
                address: input.shippingAddress,
                customerNotes: `Included with bundle ${bundle.name}`,
                statusHistory: {
                  create: {
                    to: "requested",
                    actor: { connect: { id: input.userId } },
                  },
                },
              },
            });
      }
      const deliveryFee = DELIVERY_FEES[input.deliveryMethod];
      const grandTotal = subtotal - discountTotal + deliveryFee;
      const payment =
        input.paymentMethod === "bkash"
          ? { status: "unpaid" as const, reference: null }
          : await authorizePayment(input.paymentMethod, grandTotal);
      const order = await tx.order.create({
        data: {
          orderNumber: number(),
          user: { connect: { id: input.userId } },
          subtotal,
          discountTotal,
          grandTotal,
          paymentMethod: input.paymentMethod,
          paymentStatus: payment.status,
          paymentReference: payment.reference,
          shippingAddress: input.shippingAddress,
          deliveryMethod: input.deliveryMethod,
          deliveryFee,
          idempotencyKey: input.idempotencyKey,
          items: { create: items },
          bundleItems: { create: bundles },
          statusHistory: {
            create: { to: "pending", actor: { connect: { id: input.userId } } },
          },
          ...(payment.status === "authorized"
            ? {
                paymentAttempts: {
                  create: {
                    provider: "simulated",
                    providerReference: payment.reference,
                    amount: grandTotal,
                    status: payment.status,
                  },
                },
              }
            : {}),
        },
        include: orderInclude,
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cartBundleItem.deleteMany({ where: { cartId: cart.id } });
      await recordAudit(tx, {
        actorId: input.userId,
        action: "order.checkout",
        resourceType: "order",
        resourceId: order.id,
        requestId: input.requestId,
        metadata: {
          paymentMethod: input.paymentMethod,
          deliveryMethod: input.deliveryMethod,
          grandTotal,
        },
      });
      await queueCommunication(tx, {
        recipientId: input.userId,
        type: "order.placed",
        title: "Order placed",
        message: `Order ${order.orderNumber} was placed successfully.`,
        resourceType: "order",
resourceId: order.id,
        });
      return order;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      String(error.meta?.target ?? "").includes("idempotencyKey")
    ) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: orderInclude,
      });
      if (!existing) throw error;
      return { order: existing, replayed: true };
    }
    throw error;
  }
  if (input.paymentMethod === "bkash") {
    try {
      const payment = await createBkashPayment({
        amount: order.grandTotal,
        invoiceNumber: order.orderNumber,
        payerReference: input.userId,
      });
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentReference: payment.paymentId,
          paymentAttempts: {
            create: {
              provider: "bkash",
              providerReference: payment.paymentId,
              amount: order.grandTotal,
              status: "unpaid",
              metadata: JSON.parse(JSON.stringify({
                paymentUrl: payment.paymentUrl,
                createResponse: payment.raw,
              })) as Prisma.InputJsonValue,
            },
          },
        },
        include: orderInclude,
      });
      return { order, replayed: false, paymentUrl: payment.paymentUrl };
    } catch (error) {
      await cancel(
        order.id,
        input.userId,
        "bKash payment initialization failed",
        input.requestId,
      );
      throw error;
    }
  }
  return { order, replayed: false, paymentUrl: undefined };
}

export async function cancel(
  orderId: string,
  actorId: string,
  reason = "Cancelled by user",
  requestId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (
      !order ||
      !["pending", "confirmed"].includes(order.status) ||
      order.inventoryRestoredAt
    )
      throw new AppError(
        409,
        "INVALID_ORDER_TRANSITION",
        "This order cannot be cancelled",
      );
    for (const item of order.items)
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
        inventoryRestoredAt: new Date(),
        cancellationReason: reason,
        statusHistory: {
          create: { from: order.status, to: "cancelled", changedBy: actorId },
        },
      },
      include: orderInclude,
    });
    await recordAudit(tx, {
      actorId,
      action: "order.cancelled",
      resourceType: "order",
      resourceId: orderId,
      requestId,
      metadata: { reason },
    });
    await queueCommunication(tx, {
      recipientId: order.userId,
      type: "order.cancelled",
      title: "Order cancelled",
      message: `Order ${order.orderNumber} was cancelled.`,
      resourceType: "order",
      resourceId: orderId,
    });
    return updated;
  });
}

export async function changeStatus(
  orderId: string,
  next: OrderStatus,
  actorId: string,
  fulfilment: {
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    fulfilmentNotes?: string;
  } = {},
  requestId?: string,
) {
  if (next === "cancelled")
    return cancel(orderId, actorId, "Cancelled by administrator", requestId);
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order)
      throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
    if (!TRANSITIONS[order.status].includes(next))
      throw new AppError(
        409,
        "INVALID_ORDER_TRANSITION",
        `Cannot move order from ${order.status} to ${next}`,
      );
    if (next === "shipped" && !fulfilment.trackingNumber)
      throw new AppError(
        422,
        "TRACKING_REQUIRED",
        "A tracking number is required before shipping",
      );
    const now = new Date();
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: next,
        ...fulfilment,
        ...(next === "processing" ? { packedAt: now } : {}),
        ...(next === "shipped" ? { shippedAt: now } : {}),
        ...(next === "delivered" ? { deliveredAt: now } : {}),
        statusHistory: {
          create: { from: order.status, to: next, changedBy: actorId },
        },
      },
      include: orderInclude,
    });
    await recordAudit(tx, {
      actorId,
      action: "order.status_changed",
      resourceType: "order",
      resourceId: orderId,
      requestId,
      metadata: { from: order.status, to: next, ...fulfilment },
    });
    await queueCommunication(tx, {
      recipientId: order.userId,
      type: "order.status",
      title: "Order updated",
      message: `Order ${order.orderNumber} is now ${next}.`,
      resourceType: "order",
      resourceId: orderId,
    });
    return updated;
  });
}

export async function requestReturn(
  orderId: string,
  userId: string,
  reason: string,
  requestId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: { in: ["delivered", "completed"] },
      },
    });
    if (!order)
      throw new AppError(
        409,
        "RETURN_NOT_ALLOWED",
        "Only delivered orders can be returned",
      );
    const request = await tx.returnRequest.create({
      data: { orderId, userId, reason },
    });
    await recordAudit(tx, {
      actorId: userId,
      action: "return.requested",
      resourceType: "return",
      resourceId: request.id,
      requestId,
      metadata: { orderId },
    });
    await queueCommunication(tx, {
      recipientId: userId,
      type: "return.requested",
      title: "Return request received",
      message: `We received your return request for ${order.orderNumber}.`,
      resourceType: "order",
      resourceId: orderId,
    });
    return request;
  });
}
