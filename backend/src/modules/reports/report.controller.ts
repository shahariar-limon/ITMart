import type { Request, Response } from "express";
import { ServiceBookingModel } from "../bookings/booking.model.js";
import { OrderModel } from "../orders/order.model.js";

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}
function sendCsv(
  response: Response,
  filename: string,
  headers: string[],
  rows: unknown[][],
): void {
  const body = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader(
    "content-disposition",
    `attachment; filename="${filename}"`,
  );
  response.send(`\uFEFF${body}`);
}

export async function summary(
  _request: Request,
  response: Response,
): Promise<void> {
  const [topProducts, salesByMonth, servicesByStatus, topServices] =
    await Promise.all([
      OrderModel.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.nameSnapshot" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            productId: "$_id",
            name: 1,
            units: 1,
            revenue: 1,
          },
        },
      ]),
      OrderModel.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$grandTotal" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", orders: 1, revenue: 1 } },
      ]),
      ServiceBookingModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { _id: 0, status: "$_id", count: 1 } },
        { $sort: { status: 1 } },
      ]),
      ServiceBookingModel.aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: "$serviceId",
            name: { $first: "$serviceNameSnapshot" },
            completed: { $sum: 1 },
            value: { $sum: "$basePriceSnapshot" },
          },
        },
        { $sort: { completed: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            serviceId: "$_id",
            name: 1,
            completed: 1,
            value: 1,
          },
        },
      ]),
    ]);
  response.json({
    success: true,
    data: {
      topProducts,
      salesByMonth,
      servicesByStatus,
      topServices,
      timezone: "UTC",
    },
  });
}

export async function salesCsv(
  _request: Request,
  response: Response,
): Promise<void> {
  const orders = await OrderModel.find().sort({ createdAt: -1 }).lean();
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
export async function servicesCsv(
  _request: Request,
  response: Response,
): Promise<void> {
  const bookings = await ServiceBookingModel.find()
    .sort({ createdAt: -1 })
    .lean();
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
