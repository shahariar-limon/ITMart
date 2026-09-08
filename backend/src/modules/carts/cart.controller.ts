import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import {
  addBundleItemSchema,
  addCartItemSchema,
  updateCartItemSchema,
} from "./cart.validation.js";

function userId(request: Request): string {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}
const include = {
  items: { include: { product: true } },
  bundleItems: { include: { bundle: true } },
} as const;
async function presentCart(id: string) {
  const cart = await prisma.cart.findUnique({ where: { userId: id }, include });
  if (!cart) return { userId: id, items: [], bundleItems: [] };
  return {
    _id: cart.id,
    userId: id,
    items: cart.items.map(({ product, quantity }) => {
      const { id: productId, ...fields } = product;
      return { productId: { _id: productId, ...fields }, quantity };
    }),
    bundleItems: cart.bundleItems.map(({ bundle, quantity }) => {
      const { id: bundleId, ...fields } = bundle;
      return { bundleId: { _id: bundleId, ...fields }, quantity };
    }),
  };
}
export async function get(request: Request, response: Response) {
  response.json({
    success: true,
    data: { cart: await presentCart(userId(request)) },
  });
}
export async function add(request: Request, response: Response) {
  const id = userId(request);
  const input = addCartItemSchema.parse(request.body);
  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: "active" },
  });
  if (!product)
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  const cart = await prisma.cart.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
  });
  const current = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId: input.productId },
    },
  });
  const quantity = (current?.quantity ?? 0) + input.quantity;
  if (quantity > 99 || quantity > product.stock)
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity is unavailable",
    );
  await prisma.cartItem.upsert({
    where: {
      cartId_productId: { cartId: cart.id, productId: input.productId },
    },
    create: { cartId: cart.id, productId: input.productId, quantity },
    update: { quantity },
  });
  response
    .status(201)
    .json({ success: true, data: { cart: await presentCart(id) } });
}
export async function update(request: Request, response: Response) {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const input = updateCartItemSchema.parse(request.body);
  const product = await prisma.product.findFirst({
    where: { id: productId, status: "active" },
  });
  if (!product)
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  if (input.quantity > product.stock)
    throw new AppError(
      409,
      "INSUFFICIENT_STOCK",
      "Requested quantity is unavailable",
    );
  const cart = await prisma.cart.findUnique({ where: { userId: id } });
  if (
    !cart ||
    !(await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    }))
  )
    throw new AppError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
  await prisma.cartItem.update({
    where: { cartId_productId: { cartId: cart.id, productId } },
    data: { quantity: input.quantity },
  });
  response.json({ success: true, data: { cart: await presentCart(id) } });
}
export async function remove(request: Request, response: Response) {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const cart = await prisma.cart.findUnique({ where: { userId: id } });
  if (
    !cart ||
    !(
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      })
    ).count
  )
    throw new AppError(404, "CART_ITEM_NOT_FOUND", "Cart item was not found");
  response.status(204).send();
}
export async function addBundle(request: Request, response: Response) {
  const id = userId(request);
  const input = addBundleItemSchema.parse(request.body);
  if (
    !(await prisma.bundle.findFirst({
      where: { id: input.bundleId, isActive: true },
    }))
  )
    throw new AppError(404, "BUNDLE_NOT_FOUND", "Bundle was not found");
  const cart = await prisma.cart.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
  });
  const current = await prisma.cartBundleItem.findUnique({
    where: { cartId_bundleId: { cartId: cart.id, bundleId: input.bundleId } },
  });
  const quantity = (current?.quantity ?? 0) + input.quantity;
  if (quantity > 20)
    throw new AppError(
      422,
      "BUNDLE_LIMIT_EXCEEDED",
      "Bundle quantity cannot exceed 20",
    );
  await prisma.cartBundleItem.upsert({
    where: { cartId_bundleId: { cartId: cart.id, bundleId: input.bundleId } },
    create: { cartId: cart.id, bundleId: input.bundleId, quantity },
    update: { quantity },
  });
  response
    .status(201)
    .json({ success: true, data: { cart: await presentCart(id) } });
}
export async function updateBundle(request: Request, response: Response) {
  const id = userId(request);
  const bundleId = objectIdSchema.parse(request.params.bundleId);
  const quantity = addBundleItemSchema
    .pick({ quantity: true })
    .parse(request.body).quantity;
  const cart = await prisma.cart.findUnique({ where: { userId: id } });
  if (
    !cart ||
    !(await prisma.cartBundleItem.findUnique({
      where: { cartId_bundleId: { cartId: cart.id, bundleId } },
    }))
  )
    throw new AppError(
      404,
      "CART_ITEM_NOT_FOUND",
      "Bundle cart item was not found",
    );
  await prisma.cartBundleItem.update({
    where: { cartId_bundleId: { cartId: cart.id, bundleId } },
    data: { quantity },
  });
  response.json({ success: true, data: { cart: await presentCart(id) } });
}
export async function removeBundle(request: Request, response: Response) {
  const id = userId(request);
  const bundleId = objectIdSchema.parse(request.params.bundleId);
  const cart = await prisma.cart.findUnique({ where: { userId: id } });
  if (
    !cart ||
    !(
      await prisma.cartBundleItem.deleteMany({
        where: { cartId: cart.id, bundleId },
      })
    ).count
  )
    throw new AppError(
      404,
      "CART_ITEM_NOT_FOUND",
      "Bundle cart item was not found",
    );
  response.status(204).send();
}
