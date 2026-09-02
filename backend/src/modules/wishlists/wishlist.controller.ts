import type { Request, Response } from "express";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { ProductModel } from "../products/product.model.js";
import { WishlistModel } from "./wishlist.model.js";

function userId(request: Request) {
  if (!request.user)
    throw new AppError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Authentication is required",
    );
  return request.user.id;
}
async function present(id: string) {
  return (
    (await WishlistModel.findOne({ userId: id })
      .populate({ path: "productIds", match: { status: "active" } })
      .lean()) ?? { userId: id, productIds: [] }
  );
}
export async function get(request: Request, response: Response): Promise<void> {
  response.json({
    success: true,
    data: { wishlist: await present(userId(request)) },
  });
}
export async function add(request: Request, response: Response): Promise<void> {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.body.productId);
  if (!(await ProductModel.exists({ _id: productId, status: "active" })))
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  await WishlistModel.updateOne(
    { userId: id },
    { $addToSet: { productIds: productId } },
    { upsert: true },
  );
  response
    .status(201)
    .json({ success: true, data: { wishlist: await present(id) } });
}
export async function remove(
  request: Request,
  response: Response,
): Promise<void> {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  await WishlistModel.updateOne(
    { userId: id },
    { $pull: { productIds: productId } },
  );
  response.status(204).send();
}
