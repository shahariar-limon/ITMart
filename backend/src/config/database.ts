import { prisma } from "./prisma.js";

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
