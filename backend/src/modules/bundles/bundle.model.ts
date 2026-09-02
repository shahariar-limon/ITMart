import { Schema, model, type Types } from "mongoose";
export interface BundleProduct {
  productId: Types.ObjectId;
  quantity: number;
}
export interface Bundle {
  name: string;
  description: string;
  productItems: BundleProduct[];
  serviceIds: Types.ObjectId[];
  bundlePrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const bundleProductSchema = new Schema<BundleProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, max: 99 },
  },
  { _id: false },
);
const bundleSchema = new Schema<Bundle>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    productItems: { type: [bundleProductSchema], default: [] },
    serviceIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      default: [],
    },
    bundlePrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);
bundleSchema.index({ isActive: 1, createdAt: -1 });
export const BundleModel = model<Bundle>("Bundle", bundleSchema);
