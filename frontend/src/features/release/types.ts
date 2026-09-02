import type { Product } from "../commerce/types";
import type { Service } from "../services/types";
export type Review = {
  _id: string;
  userId: { _id: string; name: string } | string;
  rating: number;
  text: string;
  verifiedPurchase: boolean;
  createdAt: string;
};
export type Wishlist = { userId: string; productIds: Product[] };
export type Bundle = {
  _id: string;
  name: string;
  description: string;
  productItems: { productId: Product; quantity: number }[];
  serviceIds: Service[];
  bundlePrice: number;
  isActive: boolean;
};
export type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  readAt?: string;
  createdAt: string;
};
export type DashboardData = {
  metrics: {
    activeProducts: number;
    customers: number;
    totalOrders: number;
    pendingOrders: number;
    activeBookings: number;
    revenue: number;
  };
  ordersByStatus: { status: string; count: number }[];
  ordersOverTime: { date: string; count: number; revenue: number }[];
  timezone: string;
};
export type ReportData = {
  topProducts: {
    productId: string;
    name: string;
    units: number;
    revenue: number;
  }[];
  salesByMonth: { month: string; orders: number; revenue: number }[];
  servicesByStatus: { status: string; count: number }[];
  topServices: {
    serviceId: string;
    name: string;
    completed: number;
    value: number;
  }[];
};
