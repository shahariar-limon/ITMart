import type { Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function sendCsv(
  response: Response,
  filename: string,
  headers: string[],
  rows: unknown[][],
) {
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader(
    "content-disposition",
    `attachment; filename="${filename}"`,
  );
  response.send(
    `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`,
  );
}
export async function summary(_request: Request, response: Response) {
  const [orders, bookings] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      include: { items: true },
    }),
    prisma.serviceBooking.findMany(),
  ]);
  const productMap = new Map<
    string,
    { productId: string; name: string; units: number; revenue: number }
  >();
  const monthMap = new Map<
    string,
    { month: string; orders: number; revenue: number }
  >();
  for (const order of orders) {
    const month = order.createdAt.toISOString().slice(0, 7);
    const monthly = monthMap.get(month) ?? { month, orders: 0, revenue: 0 };
    monthly.orders++;
    monthly.revenue += order.grandTotal;
    monthMap.set(month, monthly);
    for (const item of order.items) {
      const current = productMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.nameSnapshot,
        units: 0,
        revenue: 0,
      };
      current.units += item.quantity;
      current.revenue += item.lineTotal;
      productMap.set(item.productId, current);
    }
  }
  const statusMap = new Map<string, number>();
  const serviceMap = new Map<
    string,
    { serviceId: string; name: string; completed: number; value: number }
  >();
  for (const booking of bookings) {
    statusMap.set(booking.status, (statusMap.get(booking.status) ?? 0) + 1);
    if (booking.status === "completed") {
      const current = serviceMap.get(booking.serviceId) ?? {
        serviceId: booking.serviceId,
        name: booking.serviceNameSnapshot,
        completed: 0,
        value: 0,
      };
      current.completed++;
      current.value += booking.basePriceSnapshot;
      serviceMap.set(booking.serviceId, current);
    }
  }
  response.json({
    success: true,
    data: {
      topProducts: [...productMap.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      salesByMonth: [...monthMap.values()].sort((a, b) =>
        a.month.localeCompare(b.month),
      ),
      servicesByStatus: [...statusMap]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => a.status.localeCompare(b.status)),
      topServices: [...serviceMap.values()]
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 10),
      timezone: "UTC",
    },
  });
}
export async function salesCsv(_request: Request, response: Response) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  sendCsv(
    response,
    "sales-report.csv",
    [
      "Order Number",
      "Created UTC",
      "Status",
      "Customer ID",
      "Grand Total Minor Units",
      "Currency",
    ],
    orders.map((order) => [
      order.orderNumber,
      order.createdAt.toISOString(),
      order.status,
      order.userId,
      order.grandTotal,
      order.currency,
    ]),
  );
}
export async function servicesCsv(_request: Request, response: Response) {
  const bookings = await prisma.serviceBooking.findMany({
    orderBy: { createdAt: "desc" },
  });
  sendCsv(
    response,
    "service-report.csv",
    [
      "Booking Number",
      "Created UTC",
      "Status",
      "Service",
      "Customer ID",
      "Technician ID",
      "Scheduled Start UTC",
    ],
    bookings.map((booking) => [
      booking.bookingNumber,
      booking.createdAt.toISOString(),
      booking.status,
      booking.serviceNameSnapshot,
      booking.userId,
      booking.technicianId ?? "",
      booking.scheduledStart?.toISOString() ?? "",
    ]),
  );
}
