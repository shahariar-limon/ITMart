import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
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
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: id },
    include: {
      products: {
        where: { product: { status: "active" } },
        include: { product: true },
      },
    },
  });
  return {
    _id: wishlist?.id,
    userId: id,
    productIds:
      wishlist?.products.map(({ product }) => {
        const { id: productId, ...fields } = product;
        return { _id: productId, ...fields };
      }) ?? [],
  };
}
export async function get(request: Request, response: Response) {
  response.json({
    success: true,
    data: { wishlist: await present(userId(request)) },
  });
}
export async function add(request: Request, response: Response) {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.body.productId);
  if (
    !(await prisma.product.findFirst({
      where: { id: productId, status: "active" },
    }))
  )
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product was not found");
  const wishlist = await prisma.wishlist.upsert({
    where: { userId: id },
    create: { userId: id },
    update: {},
  });
  await prisma.wishlistProduct.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
  response
    .status(201)
    .json({ success: true, data: { wishlist: await present(id) } });
}
export async function remove(request: Request, response: Response) {
  const id = userId(request);
  const productId = objectIdSchema.parse(request.params.productId);
  const wishlist = await prisma.wishlist.findUnique({ where: { userId: id } });
  if (wishlist)
    await prisma.wishlistProduct.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
  response.status(204).send();
}
