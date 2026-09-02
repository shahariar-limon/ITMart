import { Schema, model, type Types } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: Types.ObjectId;
  nameSnapshot: string;
  skuSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sourceBundleId?: Types.ObjectId;
}
export interface OrderBundleItem {
  bundleId: Types.ObjectId;
  nameSnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serviceIds: Types.ObjectId[];
}

export interface StatusChange {
  from: OrderStatus | null;
  to: OrderStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
}

export interface Order {
  orderNumber: string;
  userId: Types.ObjectId;
  items: OrderItem[];
  bundleItems: OrderBundleItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: "BDT";
  paymentMethod: "cod" | "simulated";
  paymentStatus: "unpaid" | "authorized";
  paymentReference?: string;
  status: OrderStatus;
  shippingAddress: string;
  statusHistory: StatusChange[];
  inventoryRestoredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    nameSnapshot: { type: String, required: true },
    skuSnapshot: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    sourceBundleId: { type: Schema.Types.ObjectId, ref: "Bundle" },
  },
  { _id: false },
);
const orderBundleSchema = new Schema<OrderBundleItem>(
  {
    bundleId: { type: Schema.Types.ObjectId, ref: "Bundle", required: true },
    nameSnapshot: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    serviceIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      default: [],
    },
  },
  { _id: false },
);

const statusChangeSchema = new Schema<StatusChange>(
  {
    from: { type: String, enum: [...ORDER_STATUSES, null], default: null },
    to: { type: String, enum: ORDER_STATUSES, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema<Order>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: { type: [orderItemSchema], required: true },
    bundleItems: { type: [orderBundleSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["BDT"], default: "BDT" },
    paymentMethod: { type: String, enum: ["cod", "simulated"], default: "cod" },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "authorized"],
      default: "unpaid",
    },
    paymentReference: { type: String },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    shippingAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    statusHistory: { type: [statusChangeSchema], default: [] },
    inventoryRestoredAt: { type: Date },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const OrderModel = model<Order>("Order", orderSchema);
