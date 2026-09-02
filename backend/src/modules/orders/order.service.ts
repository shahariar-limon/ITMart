import { randomUUID } from "node:crypto";
import mongoose, { type ClientSession } from "mongoose";
import { AppError } from "../../shared/app-error.js";
import { CartModel } from "../carts/cart.model.js";
import { ProductModel } from "../products/product.model.js";
import { BundleModel } from "../bundles/bundle.model.js";
import { ServiceModel } from "../services/service.model.js";
import { ServiceBookingModel } from "../bookings/booking.model.js";
import { notify } from "../notifications/notification.service.js";
import {
  authorizePayment,
  type PaymentMethod,
} from "../payments/payment.service.js";
import { UserModel } from "../users/user.model.js";
import { OrderModel, type OrderStatus } from "./order.model.js";

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

function orderNumber(): string {
  return `ITM-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function checkout(
  userId: string,
  shippingAddress: string,
  paymentMethod: PaymentMethod = "cod",
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const cart = await CartModel.findOne({ userId }).session(session);
      if (!cart || (!cart.items.length && !cart.bundleItems.length))
        throw new AppError(422, "EMPTY_CART", "The cart is empty");
      const bundles = await BundleModel.find({
        _id: { $in: cart.bundleItems.map((item) => item.bundleId) },
        isActive: true,
      }).session(session);
      if (bundles.length !== cart.bundleItems.length)
        throw new AppError(
          409,
          "BUNDLE_UNAVAILABLE",
          "One or more bundles are no longer available",
        );
      const bundleMap = new Map(
        bundles.map((bundle) => [String(bundle._id), bundle]),
      );
      const demand = new Map<string, number>();
      for (const item of cart.items)
        demand.set(
          String(item.productId),
          (demand.get(String(item.productId)) ?? 0) + item.quantity,
        );
      for (const cartBundle of cart.bundleItems) {
        const bundle = bundleMap.get(String(cartBundle.bundleId));
        if (!bundle)
          throw new AppError(
            409,
            "BUNDLE_UNAVAILABLE",
            "A bundle is unavailable",
          );
        for (const component of bundle.productItems)
          demand.set(
            String(component.productId),
            (demand.get(String(component.productId)) ?? 0) +
              component.quantity * cartBundle.quantity,
          );
      }
      const productMap = new Map<string, InstanceType<typeof ProductModel>>();
      const customer = await UserModel.findById(userId)
        .select("accountType businessDiscountBps")
        .session(session);
      const businessRate =
        customer?.accountType === "business"
          ? customer.businessDiscountBps / 10_000
          : 0;
      for (const [productId, quantity] of demand) {
        const product = await ProductModel.findOneAndUpdate(
          { _id: productId, status: "active", stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: false, session },
        );
        if (!product)
          throw new AppError(
            409,
            "STOCK_CONFLICT",
            "One or more cart items are no longer available",
          );
        productMap.set(productId, product);
      }

      const items = [];
      const bundleItems = [];
      let subtotal = 0;
      let discountTotal = 0;
      for (const cartItem of cart.items) {
        const product = productMap.get(String(cartItem.productId));
        if (!product)
          throw new AppError(409, "STOCK_CONFLICT", "A product is unavailable");
        const businessDiscount =
          cartItem.quantity >= 10
            ? Math.round((product.price - product.discount) * businessRate)
            : 0;
        const unitPrice = product.price - product.discount - businessDiscount;
        const lineTotal = unitPrice * cartItem.quantity;
        subtotal += product.price * cartItem.quantity;
        discountTotal +=
          (product.discount + businessDiscount) * cartItem.quantity;
        items.push({
          productId: product._id,
          nameSnapshot: product.name,
          skuSnapshot: product.sku,
          quantity: cartItem.quantity,
          unitPrice,
          lineTotal,
        });
      }
      for (const cartBundle of cart.bundleItems) {
        const bundle = bundleMap.get(String(cartBundle.bundleId));
        if (!bundle)
          throw new AppError(
            409,
            "BUNDLE_UNAVAILABLE",
            "A bundle is unavailable",
          );
        const bundleTotal = bundle.bundlePrice * cartBundle.quantity;
        subtotal += bundleTotal;
        bundleItems.push({
          bundleId: bundle._id,
          nameSnapshot: bundle.name,
          quantity: cartBundle.quantity,
          unitPrice: bundle.bundlePrice,
          lineTotal: bundleTotal,
          serviceIds: bundle.serviceIds,
        });
        for (const component of bundle.productItems) {
          const product = productMap.get(String(component.productId));
          if (!product)
            throw new AppError(
              409,
              "STOCK_CONFLICT",
              "A bundle product is unavailable",
            );
          items.push({
            productId: product._id,
            nameSnapshot: product.name,
            skuSnapshot: product.sku,
            quantity: component.quantity * cartBundle.quantity,
            unitPrice: 0,
            lineTotal: 0,
            sourceBundleId: bundle._id,
          });
        }
        const services = await ServiceModel.find({
          _id: { $in: bundle.serviceIds },
          isActive: true,
        }).session(session);
        if (services.length !== bundle.serviceIds.length)
          throw new AppError(
            409,
            "BUNDLE_UNAVAILABLE",
            "A bundle service is unavailable",
          );
        for (let index = 0; index < cartBundle.quantity; index += 1)
          for (const service of services) {
            const bookingNo = `SRV-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
            await ServiceBookingModel.create(
              [
                {
                  bookingNumber: bookingNo,
                  userId,
                  serviceId: service._id,
                  serviceNameSnapshot: service.name,
                  basePriceSnapshot: 0,
                  durationMinutesSnapshot: service.durationMinutes,
                  status: "requested",
                  address: shippingAddress,
                  customerNotes: `Included with bundle ${bundle.name}`,
                  statusHistory: [
                    {
                      from: null,
                      to: "requested",
                      changedBy: userId,
                      changedAt: new Date(),
                    },
                  ],
                },
              ],
              { session },
            );
          }
      }

      const payment = await authorizePayment(
        paymentMethod,
        subtotal - discountTotal,
      );
      const [order] = await OrderModel.create(
        [
          {
            orderNumber: orderNumber(),
            userId,
            items,
            bundleItems,
            subtotal,
            discountTotal,
            grandTotal: subtotal - discountTotal,
            currency: "BDT",
            paymentMethod,
            paymentStatus: payment.status,
            paymentReference:
              "reference" in payment ? payment.reference : undefined,
            status: "pending",
            shippingAddress,
            statusHistory: [
              {
                from: null,
                to: "pending",
                changedBy: userId,
                changedAt: new Date(),
              },
            ],
          },
        ],
        { session },
      );
      if (!order)
        throw new AppError(
          500,
          "ORDER_CREATION_FAILED",
          "Order could not be created",
        );
      await CartModel.updateOne(
        { _id: cart._id },
        { $set: { items: [], bundleItems: [] } },
        { session },
      );
      await notify(
        {
          recipientId: userId,
          type: "order.placed",
          title: "Order placed",
          message: `Order ${order.orderNumber} was placed successfully.`,
          resourceType: "order",
          resourceId: String(order._id),
        },
        session,
      );
      return order;
    });
  } finally {
    await session.endSession();
  }
}

async function restoreInventory(
  orderId: string,
  actorId: string,
  session: ClientSession,
) {
  const order = await OrderModel.findOne({
    _id: orderId,
    status: { $in: ["pending", "confirmed"] },
    inventoryRestoredAt: { $exists: false },
  }).session(session);
  if (!order)
    throw new AppError(
      409,
      "INVALID_ORDER_TRANSITION",
      "This order cannot be cancelled",
    );
  for (const item of order.items)
    await ProductModel.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantity } },
      { session },
    );
  const now = new Date();
  order.statusHistory.push({
    from: order.status,
    to: "cancelled",
    changedBy: new mongoose.Types.ObjectId(actorId),
    changedAt: now,
  });
  order.status = "cancelled";
  order.inventoryRestoredAt = now;
  await order.save({ session });
  await notify(
    {
      recipientId: String(order.userId),
      type: "order.cancelled",
      title: "Order cancelled",
      message: `Order ${order.orderNumber} was cancelled.`,
      resourceType: "order",
      resourceId: String(order._id),
    },
    session,
  );
  return order;
}

export async function cancel(orderId: string, actorId: string) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() =>
      restoreInventory(orderId, actorId, session),
    );
  } finally {
    await session.endSession();
  }
}

export async function changeStatus(
  orderId: string,
  next: OrderStatus,
  actorId: string,
) {
  if (next === "cancelled") return cancel(orderId, actorId);
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError(404, "ORDER_NOT_FOUND", "Order was not found");
  if (!TRANSITIONS[order.status].includes(next))
    throw new AppError(
      409,
      "INVALID_ORDER_TRANSITION",
      `Cannot move order from ${order.status} to ${next}`,
    );
  const previous = order.status;
  order.status = next;
  order.statusHistory.push({
    from: previous,
    to: next,
    changedBy: new mongoose.Types.ObjectId(actorId),
    changedAt: new Date(),
  });
  await order.save();
  await notify({
    recipientId: String(order.userId),
    type: "order.status",
    title: "Order updated",
    message: `Order ${order.orderNumber} is now ${next}.`,
    resourceType: "order",
    resourceId: String(order._id),
  });
  return order;
}
