import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";

export async function dashboard(_request: Request, response: Response) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [
    activeProducts,
    customers,
    totalOrders,
    pendingOrders,
    activeBookings,
    revenue,
    statusGroups,
    recentOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "active" } }),
    prisma.user.count({ where: { role: "customer", isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.serviceBooking.count({
      where: {
        status: { in: ["confirmed", "assigned", "scheduled", "in_progress"] },
      },
    }),
    prisma.order.aggregate({
      where: { status: { not: "cancelled" } },
      _sum: { grandTotal: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, grandTotal: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const byDate = new Map<
    string,
    { date: string; count: number; revenue: number }
  >();
  for (const order of recentOrders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const item = byDate.get(date) ?? { date, count: 0, revenue: 0 };
    item.count += 1;
    if (order.status !== "cancelled") item.revenue += order.grandTotal;
    byDate.set(date, item);
  }
  response.json({
    success: true,
    data: {
      metrics: {
        activeProducts,
        customers,
        totalOrders,
        pendingOrders,
        activeBookings,
        revenue: revenue._sum.grandTotal ?? 0,
      },
      ordersByStatus: statusGroups.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      ordersOverTime: [...byDate.values()],
      timezone: "UTC",
    },
  });
}

export async function auditLogs(request: Request, response: Response) {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 30));
  const [logs, totalItems] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  response.json({
    success: true,
    data: { logs: logs.map(({ id, ...log }) => ({ _id: id, ...log })) },
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  });
}
export async function communicationQueue(
  _request: Request,
  response: Response,
) {
  const messages = await prisma.outboxMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  response.json({
    success: true,
    data: {
      messages: messages.map(({ id, ...message }) => ({ _id: id, ...message })),
    },
  });
}
export async function processCommunications(
  _request: Request,
  response: Response,
) {
  const pending = await prisma.outboxMessage.findMany({
    where: {
      status: { in: ["pending", "failed"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    take: 25,
    orderBy: { createdAt: "asc" },
  });
  await prisma.$transaction(
    pending.map((item) =>
      prisma.outboxMessage.update({
        where: { id: item.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      }),
    ),
  );
  response.json({
    success: true,
    data: { processed: pending.length, adapter: "simulated" },
  });
}
