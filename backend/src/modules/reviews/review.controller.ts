import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { OrderModel } from "../orders/order.model.js";
import { ProductModel } from "../products/product.model.js";
import { ReviewModel } from "./review.model.js";
import { reviewSchema } from "./review.validation.js";

function userId(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}

export async function list(
  request: Request,
  response: Response,
): Promise<void> {
  const productId = objectIdSchema.parse(request.params.productId);
  const [reviews, summary] = await Promise.all([
    ReviewModel.find({ productId })
      .populate({ path: "userId", select: "name" })
      .sort({ createdAt: -1 })
      .lean(),
    ReviewModel.aggregate<{ average: number; count: number }>([
      {
        $match: {
          productId: new mongoose.Types.ObjectId(productId),
        },
      },
      {
        $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
      },
    ]),
  ]);
  response.json({
    success: true,
    data: { reviews, summary: summary[0] ?? { average: 0, count: 0 } },
  });
}

export async function create(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const input = reviewSchema.parse(request.body);
  if (!(await ProductModel.exists({ _id: productId })))
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  const purchased = await OrderModel.exists({
    userId: id,
    status: "completed",
    "items.productId": productId,
  });
  if (!purchased)
    throw new AppError(
      403,
      "VERIFIED_PURCHASE_REQUIRED",
      "A completed purchase is required to review this product",
    );
  try {
    const review = await ReviewModel.create({
      userId: id,
      productId,
      ...input,
      verifiedPurchase: true,
    });
    response.status(201).json({ success: true, data: { review } });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      throw new AppError(
        409,
        "REVIEW_EXISTS",
        "You already reviewed this product",
      );
    throw error;
  }
}

export async function update(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const reviewId = objectIdSchema.parse(request.params.reviewId);
  const input = reviewSchema.parse(request.body);
  const review = await ReviewModel.findOneAndUpdate(
    { _id: reviewId, userId: id },
    input,
    { new: true, runValidators: true },
  );
  if (!review)
    throw new AppError(404, "REVIEW_NOT_FOUND", "Review was not found");
  response.json({ success: true, data: { review } });
}

export async function remove(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const reviewId = objectIdSchema.parse(request.params.reviewId);
  const result = await ReviewModel.deleteOne({ _id: reviewId, userId: id });
  if (!result.deletedCount)
    throw new AppError(404, "REVIEW_NOT_FOUND", "Review was not found");
  response.status(204).send();
}
