export type Category = {
  _id: string;
  name: string;
  slug: string;
  description: string;
};
export type Product = {
  _id: string;
  name: string;
  sku: string;
  categoryId: string;
  brand: string;
  description: string;
  tags: string[];
  imageUrls: string[];
  price: number;
  discount: number;
  stock: number;
  specs: Record<string, string>;
  warranty: string;
  status: "active" | "archived";
};
export type CartItem = { productId: Product; quantity: number };
export type BundleCartItem = {
  bundleId: { _id: string; name: string; bundlePrice: number };
  quantity: number;
};
export type Cart = {
  userId: string;
  items: CartItem[];
  bundleItems: BundleCartItem[];
};
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";
export type Order = {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: "BDT";
  shippingAddress: string;
  createdAt: string;
  items: {
    productId: string;
    nameSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  bundleItems: {
    bundleId: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
};
