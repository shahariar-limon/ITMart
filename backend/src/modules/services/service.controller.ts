import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { createServiceSchema, updateServiceSchema } from "./service.validation.js";

const output = <T extends { id: string }>(value: T) => { const { id, ...fields } = value; return { _id: id, ...fields }; };
export async function list(_request: Request, response: Response) {
  const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
  response.json({ success: true, data: { services: services.map(output) } });
}
export async function detail(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.serviceId);
  const service = await prisma.service.findFirst({ where: { id, isActive: true } });
  if (!service) throw new AppError(404, "SERVICE_NOT_FOUND", "Service was not found");
  response.json({ success: true, data: { service: output(service) } });
}
export async function create(request: Request, response: Response) {
  const service = await prisma.service.create({ data: createServiceSchema.parse(request.body) });
  response.status(201).json({ success: true, data: { service: output(service) } });
}
export async function update(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.serviceId);
  if (!(await prisma.service.findUnique({ where: { id } }))) throw new AppError(404, "SERVICE_NOT_FOUND", "Service was not found");
  const input = updateServiceSchema.parse(request.body);
  const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.ServiceUpdateInput;
  const service = await prisma.service.update({ where: { id }, data });
  response.json({ success: true, data: { service: output(service) } });
}
