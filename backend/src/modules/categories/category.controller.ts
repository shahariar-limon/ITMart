import type { Request, Response } from "express";
import type { Prisma } from "../../generated/prisma-client/index.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import { objectIdSchema } from "../../shared/object-id.js";
import { createCategorySchema, updateCategorySchema } from "./category.validation.js";

const output = <T extends { id: string }>(value: T) => {
  const { id, ...fields } = value;
  return { _id: id, ...fields };
};

export async function list(_request: Request, response: Response) {
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  response.json({ success: true, data: { categories: categories.map(output) } });
}

export async function create(request: Request, response: Response) {
  const input = createCategorySchema.parse(request.body);
  try {
    const category = await prisma.category.create({ data: input });
    response.status(201).json({ success: true, data: { category: output(category) } });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new AppError(409, "CATEGORY_EXISTS", "A category with this slug already exists");
    throw error;
  }
}

export async function update(request: Request, response: Response) {
  const id = objectIdSchema.parse(request.params.categoryId);
  const input = updateCategorySchema.parse(request.body);
  if (!(await prisma.category.findUnique({ where: { id } })))
    throw new AppError(404, "CATEGORY_NOT_FOUND", "Category was not found");
  const data = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.CategoryUpdateInput;
  const category = await prisma.category.update({ where: { id }, data });
  response.json({ success: true, data: { category: output(category) } });
}
