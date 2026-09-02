import { Schema, model } from "mongoose";

export const PRICE_MODELS = ["fixed", "starting_at", "quote"] as const;
export type PriceModel = (typeof PRICE_MODELS)[number];

export interface Service {
  name: string;
  category: string;
  description: string;
  priceModel: PriceModel;
  basePrice: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<Service>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    priceModel: { type: String, enum: PRICE_MODELS, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 15, max: 1440 },
    isActive: { type: Boolean, default: true, required: true, index: true },
  },
  { timestamps: true },
);

serviceSchema.index({ isActive: 1, category: 1, name: 1 });
export const ServiceModel = model<Service>("Service", serviceSchema);
