import type { Request, Response } from "express";
import { UserModel } from "./user.model.js";
import { z } from "zod";
import { objectIdSchema } from "../../shared/object-id.js";
import { AppError } from "../../shared/app-error.js";

export async function listTechnicians(
  _request: Request,
  response: Response,
): Promise<void> {
  const technicians = await UserModel.find({
    role: "technician",
    isActive: true,
  })
    .select("name email role")
    .sort({ name: 1 })
    .lean();
  response.json({ success: true, data: { technicians } });
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
  const user = await UserModel.findOneAndUpdate(
    { _id: id, role: "customer" },
    input,
    { new: true, runValidators: true },
  ).select("name email role accountType businessDiscountBps");
  if (!user)
    throw new AppError(404, "USER_NOT_FOUND", "Customer was not found");
  response.json({ success: true, data: { user } });
}
