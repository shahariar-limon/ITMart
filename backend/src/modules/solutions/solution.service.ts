import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../shared/app-error.js";
import { ServiceBookingModel } from "../bookings/booking.model.js";
import { notify } from "../notifications/notification.service.js";
import { OrderModel } from "../orders/order.model.js";
import { ProductModel } from "../products/product.model.js";
import { ServiceModel } from "../services/service.model.js";
import { SolutionRequestModel } from "./solution.model.js";
export async function acceptQuote(
  id: string,
  userId: string,
  shippingAddress: string,
) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const solution = await SolutionRequestModel.findOne({
        _id: id,
        userId,
        status: "quoted",
        expiresAt: { $gt: new Date() },
      }).session(session);
      if (!solution || solution.quotedPrice === undefined)
        throw new AppError(
          409,
          "QUOTE_UNAVAILABLE",
          "Quotation is unavailable or expired",
        );
      const items = [];
      for (const quoted of solution.quoteProductItems) {
        const product = await ProductModel.findOneAndUpdate(
          {
            _id: quoted.productId,
            status: "active",
            stock: { $gte: quoted.quantity },
          },
          { $inc: { stock: -quoted.quantity } },
          { new: false, session },
        );
        if (!product)
          throw new AppError(
            409,
            "STOCK_CONFLICT",
            "A quoted product is unavailable",
          );
        items.push({
          productId: product._id,
          nameSnapshot: product.name,
          skuSnapshot: product.sku,
          quantity: quoted.quantity,
          unitPrice: 0,
          lineTotal: 0,
        });
      }
      const now = new Date();
      const [order] = await OrderModel.create(
        [
          {
            orderNumber: `ITM-Q-${randomUUID().slice(0, 8).toUpperCase()}`,
            userId,
            items,
            bundleItems: [],
            subtotal: solution.quotedPrice,
            discountTotal: 0,
            grandTotal: solution.quotedPrice,
            currency: "BDT",
            paymentMethod: "cod",
            paymentStatus: "unpaid",
            status: "pending",
            shippingAddress,
            statusHistory: [
              { from: null, to: "pending", changedBy: userId, changedAt: now },
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
      const services = await ServiceModel.find({
        _id: { $in: solution.quoteServiceIds },
        isActive: true,
      }).session(session);
      if (services.length !== solution.quoteServiceIds.length)
        throw new AppError(
          409,
          "SERVICE_UNAVAILABLE",
          "A quoted service is unavailable",
        );
      for (const service of services)
        await ServiceBookingModel.create(
          [
            {
              bookingNumber: `SRV-Q-${randomUUID().slice(0, 8).toUpperCase()}`,
              userId,
              serviceId: service._id,
              serviceNameSnapshot: service.name,
              basePriceSnapshot: 0,
              durationMinutesSnapshot: service.durationMinutes,
              status: "requested",
              address: shippingAddress,
              customerNotes: `Created from solution request ${solution.title}`,
              statusHistory: [
                {
                  from: null,
                  to: "requested",
                  changedBy: userId,
                  changedAt: now,
                },
              ],
            },
          ],
          { session },
        );
      solution.status = "accepted";
      solution.orderId = order._id;
      await solution.save({ session });
      await notify(
        {
          recipientId: userId,
          type: "quote.accepted",
          title: "Quotation accepted",
          message: "Your solution order was created.",
          resourceType: "order",
          resourceId: String(order._id),
        },
        session,
      );
      return { solution, order };
    });
  } finally {
    await session.endSession();
  }
}
