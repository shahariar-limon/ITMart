import { apiClient } from "../../api/client";
import type { Product } from "../commerce/types";
import type {
  DashboardData,
  Bundle,
  Notification,
  ReportData,
  Review,
  Wishlist,
} from "./types";
type Envelope<T> = { success: true; data: T };
export async function getReviews(productId: string) {
  return (
    await apiClient.get<
      Envelope<{
        reviews: Review[];
        summary: { average: number; count: number };
      }>
    >(`/products/${productId}/reviews`)
  ).data.data;
}
export async function createReview(
  productId: string,
  rating: number,
  text: string,
) {
  return (
    await apiClient.post<Envelope<{ review: Review }>>(
      `/products/${productId}/reviews`,
      { rating, text },
    )
  ).data.data.review;
}
export async function getWishlist() {
  return (await apiClient.get<Envelope<{ wishlist: Wishlist }>>("/wishlist"))
    .data.data.wishlist;
}
export async function addWishlist(productId: string) {
  return (
    await apiClient.post<Envelope<{ wishlist: Wishlist }>>("/wishlist/items", {
      productId,
    })
  ).data.data.wishlist;
}
export async function removeWishlist(productId: string) {
  await apiClient.delete(`/wishlist/items/${productId}`);
}
export async function getBundles() {
  return (await apiClient.get<Envelope<{ bundles: Bundle[] }>>("/bundles")).data
    .data.bundles;
}
export async function createBundle(input: {
  name: string;
  description: string;
  productItems: { productId: string; quantity: number }[];
  serviceIds: string[];
  bundlePrice: number;
}) {
  return (await apiClient.post<Envelope<{ bundle: Bundle }>>("/bundles", input))
    .data.data.bundle;
}
export async function addBundleToCart(bundleId: string, quantity = 1) {
  return (await apiClient.post("/cart/bundles", { bundleId, quantity })).data;
}
export async function getNotifications() {
  return (
    await apiClient.get<
      Envelope<{ notifications: Notification[]; unreadCount: number }>
    >("/notifications")
  ).data.data;
}
export async function markNotificationRead(id: string) {
  await apiClient.patch(`/notifications/${id}/read`);
}
export async function markAllNotificationsRead() {
  await apiClient.post("/notifications/read-all");
}
export async function getDashboard() {
  return (await apiClient.get<Envelope<DashboardData>>("/admin/dashboard")).data
    .data;
}
export async function getReports() {
  return (await apiClient.get<Envelope<ReportData>>("/reports/summary")).data
    .data;
}
export async function downloadReport(path: "sales.csv" | "services.csv") {
  const response = await apiClient.get(`/reports/${path}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = path;
  anchor.click();
  URL.revokeObjectURL(url);
}
export type { Product };
