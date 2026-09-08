import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";
import { AppError } from "../../shared/app-error.js";

export async function listTechnicians(
  _request: Request,
  response: Response,
): Promise<void> {
  const technicians = await prisma.user.findMany({
    where: { role: "technician", isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  response.json({
    success: true,
    data: {
      technicians: technicians.map(({ id, ...item }) => ({ _id: id, ...item })),
    },
  });
}
export async function updateBusinessAccount(
  request: Request,
  response: Response,
): Promise<void> {
  const id = objectIdSchema.parse(request.params.userId);
  const input = z
    .object({
      accountType: z.enum(["personal", "business"]),
      businessDiscountBps: z.number().int().min(0).max(5000).default(0),
    })
    .strict()
    .parse(request.body);
  const existing = await prisma.user.findFirst({
    where: { id, role: "customer" },
  });
  if (!existing)
    throw new AppError(404, "USER_NOT_FOUND", "Customer was not found");
  const user = await prisma.user.update({
    where: { id },
    data: input,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountType: true,
      businessDiscountBps: true,
    },
  });
  response.json({ success: true, data: { user: { _id: user.id, ...user } } });
}
