import { Schema, model, type Types } from "mongoose";

export interface CartItem {
  productId: Types.ObjectId;
  quantity: number;
}
export interface BundleCartItem {
  bundleId: Types.ObjectId;
  quantity: number;
}

export interface Cart {
  userId: Types.ObjectId;
  items: CartItem[];
  bundleItems: BundleCartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<CartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);
const bundleCartItemSchema = new Schema<BundleCartItem>(
  {
    bundleId: { type: Schema.Types.ObjectId, ref: "Bundle", required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
  },
  { _id: false },
);

const cartSchema = new Schema<Cart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [cartItemSchema], default: [] },
    bundleItems: { type: [bundleCartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const CartModel = model<Cart>("Cart", cartSchema);
