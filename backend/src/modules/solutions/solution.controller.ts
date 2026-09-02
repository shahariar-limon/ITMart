import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { notify } from "../notifications/notification.service.js";
import { ProductModel } from "../products/product.model.js";
import { ServiceModel } from "../services/service.model.js";
import { acceptQuote } from "./solution.service.js";
import { SolutionRequestModel } from "./solution.model.js";
function actor(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user;
}
export async function create(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const input = z
    .object({
      title: z.string().trim().min(3).max(160),
      requirements: z.string().trim().min(10).max(10000),
    })
    .strict()
    .parse(request.body);
  const solution = await SolutionRequestModel.create({
    userId: user.id,
    ...input,
  });
  response.status(201).json({ success: true, data: { solution } });
}
export async function list(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const solutions = await SolutionRequestModel.find(
    user.role === "admin" ? {} : { userId: user.id },
  )
    .populate("quoteProductItems.productId", "name sku")
    .populate("quoteServiceIds", "name")
    .sort({ createdAt: -1 })
    .lean();
  response.json({ success: true, data: { solutions } });
}
export async function quote(
  request: Request,
  response: Response,
): Promise<void> {
  const id = objectIdSchema.parse(request.params.solutionId);
  const input = z
    .object({
      productItems: z
        .array(
          z.object({
            productId: objectIdSchema,
            quantity: z.number().int().min(1).max(999),
          }),
        )
        .max(50)
        .default([]),
      serviceIds: z.array(objectIdSchema).max(30).default([]),
      quotedPrice: z.number().int().nonnegative(),
      adminNotes: z.string().trim().max(3000).default(""),
      expiresAt: z.coerce.date(),
    })
    .strict()
    .parse(request.body);
  if (input.expiresAt <= new Date())
    throw new AppError(422, "INVALID_EXPIRY", "Expiry must be in the future");
  const [products, services] = await Promise.all([
    ProductModel.countDocuments({
      _id: { $in: input.productItems.map((item) => item.productId) },
      status: "active",
    }),
    ServiceModel.countDocuments({
      _id: { $in: input.serviceIds },
      isActive: true,
    }),
  ]);
  if (
    products !==
      new Set(input.productItems.map((item) => item.productId)).size ||
    services !== new Set(input.serviceIds).size
  )
    throw new AppError(
      422,
      "INVALID_QUOTE_COMPONENT",
      "Quote components must be active and unique",
    );
  const solution = await SolutionRequestModel.findOneAndUpdate(
    { _id: id, status: { $in: ["submitted", "quoted"] } },
    {
      status: "quoted",
      quoteProductItems: input.productItems,
      quoteServiceIds: input.serviceIds,
      quotedPrice: input.quotedPrice,
      adminNotes: input.adminNotes,
      expiresAt: input.expiresAt,
    },
    { new: true, runValidators: true },
  );
  if (!solution)
    throw new AppError(
      409,
      "SOLUTION_NOT_QUOTABLE",
      "Solution request cannot be quoted",
    );
  await notify({
    recipientId: String(solution.userId),
    type: "quote.ready",
    title: "Quotation ready",
    message: `A quotation for ${solution.title} is ready.`,
    resourceType: "solution",
    resourceId: String(solution._id),
  });
  response.json({ success: true, data: { solution } });
}
export async function decide(
  request: Request,
  response: Response,
): Promise<void> {
  const user = actor(request);
  const id = objectIdSchema.parse(request.params.solutionId);
  const input = z
    .discriminatedUnion("decision", [
      z.object({
        decision: z.literal("accept"),
        shippingAddress: z.string().trim().min(10).max(500),
      }),
      z.object({ decision: z.literal("reject") }),
    ])
    .parse(request.body);
  if (input.decision === "accept") {
    const result = await acceptQuote(id, user.id, input.shippingAddress);
    response.json({ success: true, data: result });
    return;
  }
  const solution = await SolutionRequestModel.findOneAndUpdate(
    { _id: id, userId: user.id, status: "quoted" },
    { status: "rejected" },
    { new: true },
  );
  if (!solution)
    throw new AppError(409, "QUOTE_UNAVAILABLE", "Quotation is unavailable");
  response.json({ success: true, data: { solution } });
}
