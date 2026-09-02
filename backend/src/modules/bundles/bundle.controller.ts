import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { createBundleSchema, updateBundleSchema } from "./bundle.validation.js";

const include = { productItems: { include: { product: true } }, services: { include: { service: true } } } as const;
function serialize(bundle: Record<string, unknown> & { id: string; productItems: Array<{ product: { id: string }; quantity: number }>; services: Array<{ service: { id: string } }> }) {
  const { id, productItems, services, ...fields } = bundle;
  return { _id: id, ...fields, productItems: productItems.map(({ product, quantity }) => { const { id: productId, ...value } = product; return { productId: { _id: productId, ...value }, quantity }; }), serviceIds: services.map(({ service }) => { const { id: serviceId, ...value } = service; return { _id: serviceId, ...value }; }) };
}
async function validateComponents(productItems: { productId: string }[] = [], serviceIds: string[] = []) {
  const productIds = [...new Set(productItems.map((item) => item.productId))];
  const uniqueServices = [...new Set(serviceIds)];
  const [products, services] = await Promise.all([prisma.product.count({ where: { id: { in: productIds }, status: "active" } }), prisma.service.count({ where: { id: { in: uniqueServices }, isActive: true } })]);
  if (products !== productIds.length || services !== uniqueServices.length || productIds.length !== productItems.length || uniqueServices.length !== serviceIds.length)
    throw new AppError(422, "INVALID_BUNDLE_COMPONENT", "All bundle components must be active and unique");
}
export async function list(_request: Request, response: Response) {
  const bundles = await prisma.bundle.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" }, include });
  response.json({ success: true, data: { bundles: bundles.map((bundle) => serialize(bundle)) } });
}
export async function detail(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.bundleId);
  const bundle = await prisma.bundle.findFirst({ where: { id, isActive: true }, include });
  if (!bundle) throw new AppError(404, "BUNDLE_NOT_FOUND", "Bundle was not found");
  response.json({ success: true, data: { bundle: serialize(bundle) } });
}
export async function create(request: Request, response: Response) {
  const input = createBundleSchema.parse(request.body); await validateComponents(input.productItems, input.serviceIds);
  const bundle = await prisma.bundle.create({ data: { name: input.name, description: input.description, bundlePrice: input.bundlePrice, isActive: input.isActive, productItems: { create: input.productItems }, services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) } }, include });
  response.status(201).json({ success: true, data: { bundle: serialize(bundle) } });
}
export async function update(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.bundleId); const input = updateBundleSchema.parse(request.body);
  const existing = await prisma.bundle.findUnique({ where: { id }, include }); if (!existing) throw new AppError(404, "BUNDLE_NOT_FOUND", "Bundle was not found");
  const products = input.productItems ?? existing.productItems.map(({ productId, quantity }) => ({ productId, quantity })); const services = input.serviceIds ?? existing.services.map(({ serviceId }) => serviceId); await validateComponents(products, services);
  const bundle = await prisma.$transaction(async (tx) => { if (input.productItems) await tx.bundleProduct.deleteMany({ where: { bundleId: id } }); if (input.serviceIds) await tx.bundleService.deleteMany({ where: { bundleId: id } }); return tx.bundle.update({ where: { id }, data: { ...(input.name === undefined ? {} : { name: input.name }), ...(input.description === undefined ? {} : { description: input.description }), ...(input.bundlePrice === undefined ? {} : { bundlePrice: input.bundlePrice }), ...(input.isActive === undefined ? {} : { isActive: input.isActive }), ...(input.productItems ? { productItems: { create: input.productItems } } : {}), ...(input.serviceIds ? { services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) } } : {}) }, include }); });
  response.json({ success: true, data: { bundle: serialize(bundle) } });
}
export async function archive(request: Request, response: Response) { const id = objectIdSchema.parse(request.params.bundleId); if (!(await prisma.bundle.findUnique({ where: { id } }))) throw new AppError(404, "BUNDLE_NOT_FOUND", "Bundle was not found"); await prisma.bundle.update({ where: { id }, data: { isActive: false } }); response.status(204).send(); }
