import { apiClient } from "../../api/client";
import type { Cart, Category, Order, OrderStatus, Product } from "./types";

type Envelope<T> = {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};
export async function getCategories() {
  return (
    await apiClient.get<Envelope<{ categories: Category[] }>>("/categories")
  ).data.data.categories;
}
export async function getProducts(
  params: Record<string, string | number | boolean | undefined> = {},
) {
  return (
    await apiClient.get<Envelope<{ products: Product[] }>>("/products", {
      params,
    })
  ).data;
}
export async function getProduct(id: string) {
  return (
    await apiClient.get<Envelope<{ product: Product }>>(`/products/${id}`)
  ).data.data.product;
}
export async function createCategory(input: {
  name: string;
  slug: string;
  description: string;
}) {
  return (
    await apiClient.post<Envelope<{ category: Category }>>("/categories", input)
  ).data.data.category;
}
export async function createProduct(input: Omit<Product, "_id" | "status">) {
  return (
    await apiClient.post<Envelope<{ product: Product }>>("/products", input)
  ).data.data.product;
}
export async function archiveProduct(id: string) {
  await apiClient.delete(`/products/${id}`);
}
export async function getCart() {
  return (await apiClient.get<Envelope<{ cart: Cart }>>("/cart")).data.data
    .cart;
}
export async function addCartItem(productId: string, quantity = 1) {
  return (
    await apiClient.post<Envelope<{ cart: Cart }>>("/cart/items", {
      productId,
      quantity,
    })
  ).data.data.cart;
}
export async function updateCartItem(productId: string, quantity: number) {
  return (
    await apiClient.patch<Envelope<{ cart: Cart }>>(
      `/cart/items/${productId}`,
      { quantity },
    )
  ).data.data.cart;
}
export async function removeCartItem(productId: string) {
  await apiClient.delete(`/cart/items/${productId}`);
}
export async function updateBundleCartItem(bundleId: string, quantity: number) {
  return (
    await apiClient.patch<Envelope<{ cart: Cart }>>(
      `/cart/bundles/${bundleId}`,
      { quantity },
    )
  ).data.data.cart;
}
export async function removeBundleCartItem(bundleId: string) {
  await apiClient.delete(`/cart/bundles/${bundleId}`);
}
export async function checkout(
  shippingAddress: string,
  paymentMethod: "cod" | "simulated" = "cod",
) {
  return (
    await apiClient.post<Envelope<{ order: Order }>>("/orders", {
      shippingAddress,
      paymentMethod,
    })
  ).data.data.order;
}
export async function getOrders() {
  return (await apiClient.get<Envelope<{ orders: Order[] }>>("/orders")).data
    .data.orders;
}
export async function cancelOrder(id: string) {
  return (
    await apiClient.post<Envelope<{ order: Order }>>(`/orders/${id}/cancel`)
  ).data.data.order;
}
export async function updateOrderStatus(id: string, status: OrderStatus) {
  return (
    await apiClient.patch<Envelope<{ order: Order }>>(`/orders/${id}/status`, {
      status,
    })
  ).data.data.order;
}
