import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma-client/index.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
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
const serialize = <T extends { id: string; user?: { id: string } }>(
  review: T,
) => {
  const { id, user, ...fields } = review;
  return {
    _id: id,
    ...fields,
    ...(user ? { userId: { _id: user.id, ...user } } : {}),
  };
};
export async function list(request: Request, response: Response) {
  const productId = objectIdSchema.parse(request.params.productId);
  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  response.json({
    success: true,
    data: {
      reviews: reviews.map(serialize),
      summary: { average: aggregate._avg.rating ?? 0, count: aggregate._count },
    },
  });
}
export async function create(request: Request, response: Response) {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const input = reviewSchema.parse(request.body);
  if (!(await prisma.product.findUnique({ where: { id: productId } })))
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  if (
    !(await prisma.orderItem.findFirst({
      where: { productId, order: { userId: id, status: "completed" } },
    }))
  )
    throw new AppError(
      403,
      "VERIFIED_PURCHASE_REQUIRED",
      "A completed purchase is required to review this product",
    );
  try {
    const review = await prisma.review.create({
      data: { userId: id, productId, ...input, verifiedPurchase: true },
    });
    response
      .status(201)
      .json({ success: true, data: { review: serialize(review) } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(
        409,
        "REVIEW_EXISTS",
        "You already reviewed this product",
      );
    throw error;
  }
}
export async function update(request: Request, response: Response) {
  const id = userId(request);
  const reviewId = objectIdSchema.parse(request.params.reviewId);
  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId: id },
  });
  if (!existing)
    throw new AppError(404, "REVIEW_NOT_FOUND", "Review was not found");
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: reviewSchema.parse(request.body),
  });
  response.json({ success: true, data: { review: serialize(review) } });
}
export async function remove(request: Request, response: Response) {
  const id = userId(request);
  const reviewId = objectIdSchema.parse(request.params.reviewId);
  if (
    !(await prisma.review.deleteMany({ where: { id: reviewId, userId: id } }))
      .count
  )
    throw new AppError(404, "REVIEW_NOT_FOUND", "Review was not found");
  response.status(204).send();
}
