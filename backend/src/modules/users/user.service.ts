import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import type { z } from "zod";
import type { updateUserSchema, userListSchema } from "./user.validation.js";

const safeFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export async function listUsers(input: z.infer<typeof userListSchema>) {
  const where = input.q
    ? {
        OR: [
          { name: { contains: input.q, mode: "insensitive" as const } },
          { email: { contains: input.q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      select: safeFields,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    users: users.map(({ id, ...user }) => ({ _id: id, ...user })),
    meta: {
      page: input.page,
      limit: input.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / input.limit),
    },
  };
}

export async function updateUser(
  id: string,
  input: z.infer<typeof updateUserSchema>,
) {
  // An atomic condition keeps existing administrators protected, even during
  // concurrent requests to promote or deactivate the same account.
  const accessChange = input.role !== undefined || input.isActive !== undefined;
  const changed = await prisma.user.updateMany({
    where: { id, ...(accessChange ? { role: { not: "admin" as const } } : {}) },
    data: input,
  });
  if (!changed.count) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing)
      throw new AppError(404, "USER_NOT_FOUND", "User was not found");
    throw new AppError(
      409,
      "ADMIN_ACCOUNT_PROTECTED",
      "Administrator roles and active status are protected from changes here",
    );
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: safeFields,
  });
  const { id: userId, ...fields } = user;
  return { _id: userId, ...fields };
}
