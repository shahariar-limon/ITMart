import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { ProductModel } from "../products/product.model.js";
import { CartModel } from "./cart.model.js";
import {
  addBundleItemSchema,
  addCartItemSchema,
  updateCartItemSchema,
} from "./cart.validation.js";
import { BundleModel } from "../bundles/bundle.model.js";

function userId(request: Request): string {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}

async function presentCart(id: string) {
  const cart = await CartModel.findOne({ userId: id })
    .populate({
      path: "items.productId",
      select: "name sku price discount stock imageUrls status",
    })
    .populate({
      path: "bundleItems.bundleId",
      match: { isActive: true },
      populate: [
        { path: "productItems.productId", select: "name sku stock" },
        { path: "serviceIds", select: "name durationMinutes" },
      ],
    })
    .lean();
  return cart ?? { userId: id, items: [], bundleItems: [] };
}

export async function get(request: Request, response: Response): Promise<void> {
  response.json({
    success: true,
    data: { cart: await presentCart(userId(request)) },
  });
}

export async function add(request: Request, response: Response): Promise<void> {
  const id = userId(request);
  const input = addCartItemSchema.parse(request.body);
  const product = await ProductModel.findOne({
    _id: input.productId,
    status: "active",
  }).lean();
  if (!product)
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  if (input.quantity > product.stock)
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity is unavailable",
    );

  let cart = await CartModel.findOne({ userId: id });
  if (!cart) cart = await CartModel.create({ userId: id, items: [] });
  const existing = cart.items.find(
    (item) => String(item.productId) === input.productId,
  );
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
  if (nextQuantity > 99 || nextQuantity > product.stock)
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity is unavailable",
    );
  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ productId: product._id, quantity: input.quantity });
  await cart.save();
  response
    .status(201)
    .json({ success: true, data: { cart: await presentCart(id) } });
}

export async function update(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const input = updateCartItemSchema.parse(request.body);
  const product = await ProductModel.findOne({
    _id: productId,
    status: "active",
  }).lean();
  if (!product)
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  if (input.quantity > product.stock)
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity is unavailable",
    );
  const cart = await CartModel.findOne({ userId: id });
  const item = cart?.items.find(
    (candidate) => String(candidate.productId) === productId,
  );
  if (!cart || !item)
    throw new AppError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
  item.quantity = input.quantity;
  await cart.save();
  response.json({ success: true, data: { cart: await presentCart(id) } });
}

export async function remove(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const result = await CartModel.updateOne(
    { userId: id, "items.productId": productId },
    { $pull: { items: { productId } } },
  );
  if (!result.modifiedCount)
    throw new AppError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
  response.status(204).send();
}

export async function addBundle(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const input = addBundleItemSchema.parse(request.body);
  if (!(await BundleModel.exists({ _id: input.bundleId, isActive: true })))
    throw new AppError(404, "BUNDLE_NOT_FOUND", "Bundle was not found");
  let cart = await CartModel.findOne({ userId: id });
  if (!cart)
    cart = await CartModel.create({ userId: id, items: [], bundleItems: [] });
  const existing = cart.bundleItems.find(
    (item) => String(item.bundleId) === input.bundleId,
  );
  const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
  if (nextQuantity > 20)
    throw new AppError(
      422,
      "BUNDLE_LIMIT_EXCEEDED",
      "Bundle quantity cannot exceed 20",
    );
  if (existing) existing.quantity = nextQuantity;
  else
    cart.bundleItems.push({
      bundleId: new mongoose.Types.ObjectId(input.bundleId),
      quantity: input.quantity,
    });
  await cart.save();
  response
    .status(201)
    .json({ success: true, data: { cart: await presentCart(id) } });
}

export async function updateBundle(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const bundleId = objectIdSchema.parse(request.params.bundleId);
  const quantity = addBundleItemSchema
    .pick({ quantity: true })
    .parse(request.body).quantity;
  const cart = await CartModel.findOne({ userId: id });
  const item = cart?.bundleItems.find(
    (candidate) => String(candidate.bundleId) === bundleId,
  );
  if (!cart || !item)
    throw new AppError(
      404,
      "CART_ITEM_NOT_FOUND",
      "Bundle cart item was not found",
    );
  item.quantity = quantity;
  await cart.save();
  response.json({ success: true, data: { cart: await presentCart(id) } });
}

export async function removeBundle(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const bundleId = objectIdSchema.parse(request.params.bundleId);
  const result = await CartModel.updateOne(
    { userId: id, "bundleItems.bundleId": bundleId },
    { $pull: { bundleItems: { bundleId } } },
  );
  if (!result.modifiedCount)
    throw new AppError(
      404,
      "CART_ITEM_NOT_FOUND",
      "Bundle cart item was not found",
    );
  response.status(204).send();
}
