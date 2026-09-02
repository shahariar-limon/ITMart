import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/app-error.js";
import type { UserRole } from "../users/user.model.js";
import type { LoginInput, RegisterInput } from "./auth.validation.js";

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function signAccessToken(id: string, role: UserRole): string {
  const expiresIn = env.JWT_EXPIRES_IN as NonNullable<SignOptions["expiresIn"]>;
  return jwt.sign({ sub: id, role }, env.JWT_SECRET, {
    expiresIn,
    issuer: "itmart-api",
    audience: "itmart-web",
  });
}

export async function register(
  input: RegisterInput,
): Promise<{ user: SafeUser; accessToken: string }> {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  let user;
  try {
    user = await prisma.user.create({ data: {
      name: input.name,
      email,
      passwordHash,
      role: "customer",
    } });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new AppError(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists",
      );
    }
    throw error;
  }

  const safeUser = toSafeUser(user);
  return {
    user: safeUser,
    accessToken: signAccessToken(safeUser.id, safeUser.role),
  };
}

export async function login(
  input: LoginInput,
): Promise<{ user: SafeUser; accessToken: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  const passwordMatches = user
    ? await bcrypt.compare(input.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches || !user.isActive) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect",
    );
  }

  const safeUser = toSafeUser(user);
  return {
    user: safeUser,
    accessToken: signAccessToken(safeUser.id, safeUser.role),
  };
}

export async function getCurrentUser(id: string): Promise<SafeUser> {
  const user = await prisma.user.findFirst({ where: { id, isActive: true } });
  if (!user) {
    throw new AppError(
      401,
      "ACCOUNT_UNAVAILABLE",
      "The account is unavailable",
    );
  }
  return toSafeUser(user);
}
