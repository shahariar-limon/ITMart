import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";

export async function dashboard(_request: Request, response: Response) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [activeProducts, customers, totalOrders, pendingOrders, activeBookings, revenue, statusGroups, recentOrders] = await Promise.all([
    prisma.product.count({ where: { status: "active" } }),
    prisma.user.count({ where: { role: "customer", isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.serviceBooking.count({ where: { status: { in: ["confirmed", "assigned", "scheduled", "in_progress"] } } }),
    prisma.order.aggregate({ where: { status: { not: "cancelled" } }, _sum: { grandTotal: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.order.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, grandTotal: true, status: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const byDate = new Map<string, { date: string; count: number; revenue: number }>();
  for (const order of recentOrders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const item = byDate.get(date) ?? { date, count: 0, revenue: 0 };
    item.count += 1;
    if (order.status !== "cancelled") item.revenue += order.grandTotal;
    byDate.set(date, item);
  }
  response.json({ success: true, data: { metrics: { activeProducts, customers, totalOrders, pendingOrders, activeBookings, revenue: revenue._sum.grandTotal ?? 0 }, ordersByStatus: statusGroups.map((item) => ({ status: item.status, count: item._count._all })), ordersOverTime: [...byDate.values()], timezone: "UTC" } });
}
