import { Schema, model, type Types } from "mongoose";

export const PRODUCT_STATUSES = ["active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface Product {
  name: string;
  sku: string;
  categoryId: Types.ObjectId;
  brand: string;
  description: string;
  tags: string[];
  imageUrls: string[];
  price: number;
  discount: number;
  stock: number;
  specs: Map<string, string>;
  warranty: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<Product>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 64,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    tags: { type: [String], default: [] },
    imageUrls: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, default: 0, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    specs: { type: Map, of: String, default: {} },
    warranty: { type: String, default: "", trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, categoryId: 1, brand: 1, price: 1 });
productSchema.index({ name: "text", sku: "text", brand: "text", tags: "text" });

export const ProductModel = model<Product>("Product", productSchema);
