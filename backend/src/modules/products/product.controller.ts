import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { createProductSchema, productListSchema, updateProductSchema } from "./product.validation.js";

const output = <T extends { id: string }>(value: T) => { const { id, ...fields } = value; return { _id: id, ...fields }; };
async function assertCategory(categoryId: string) {
  if (!(await prisma.category.findFirst({ where: { id: categoryId, isActive: true } })))
    throw new AppError(422, "INVALID_CATEGORY", "An active category is required");
}

export async function list(request: Request, response: Response) {
  const query = productListSchema.parse(request.query);
  if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice)
    throw new AppError(422, "INVALID_PRICE_RANGE", "Minimum price cannot exceed maximum price");
  const where: Prisma.ProductWhereInput = {
    status: "active",
    ...(query.category ? { categoryId: query.category } : {}),
    ...(query.brand ? { brand: { equals: query.brand, mode: "insensitive" } } : {}),
    ...(query.available === "true" ? { stock: { gt: 0 } } : query.available === "false" ? { stock: 0 } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined ? { price: { ...(query.minPrice === undefined ? {} : { gte: query.minPrice }), ...(query.maxPrice === undefined ? {} : { lte: query.maxPrice }) } } : {}),
    ...(query.q ? { OR: ["name", "sku", "brand"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" } })) as Prisma.ProductWhereInput[] } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort === "price_asc" ? { price: "asc" } : query.sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };
  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.product.count({ where }),
  ]);
  response.json({ success: true, data: { products: products.map(output) }, meta: { page: query.page, limit: query.limit, totalItems, totalPages: Math.ceil(totalItems / query.limit) } });
}

export async function detail(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.productId);
  const product = await prisma.product.findFirst({ where: { id, status: "active" } });
  if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  response.json({ success: true, data: { product: output(product) } });
}

export async function create(request: Request, response: Response) {
  const input = createProductSchema.parse(request.body);
  await assertCategory(input.categoryId);
  try {
    const product = await prisma.product.create({ data: input });
    response.status(201).json({ success: true, data: { product: output(product) } });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new AppError(409, "SKU_EXISTS", "A product with this SKU already exists");
    throw error;
  }
}

export async function update(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.productId);
  const input = updateProductSchema.parse(request.body);
  if (input.categoryId) await assertCategory(input.categoryId);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  if (input.discount !== undefined && input.discount > (input.price ?? existing.price))
    throw new AppError(422, "INVALID_DISCOUNT", "Discount cannot exceed price");
  const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.ProductUncheckedUpdateInput;
  const product = await prisma.product.update({ where: { id }, data });
  response.json({ success: true, data: { product: output(product) } });
}

export async function archive(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.productId);
  if (!(await prisma.product.findUnique({ where: { id } }))) throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  await prisma.product.update({ where: { id }, data: { status: "archived" } });
  response.status(204).send();
}
