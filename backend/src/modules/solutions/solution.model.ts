import { Schema, model, type Types } from "mongoose";
export type SolutionStatus = "submitted" | "quoted" | "accepted" | "rejected";
export interface SolutionRequest {
  userId: Types.ObjectId;
  title: string;
  requirements: string;
  status: SolutionStatus;
  quoteProductItems: { productId: Types.ObjectId; quantity: number }[];
  quoteServiceIds: Types.ObjectId[];
  quotedPrice?: number;
  adminNotes: string;
  expiresAt?: Date;
  orderId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const itemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1, max: 999 },
  },
  { _id: false },
);
const schema = new Schema<SolutionRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    requirements: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    status: {
      type: String,
      enum: ["submitted", "quoted", "accepted", "rejected"],
      default: "submitted",
      index: true,
    },
    quoteProductItems: { type: [itemSchema], default: [] },
    quoteServiceIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Service" }],
      default: [],
    },
    quotedPrice: { type: Number, min: 0 },
    adminNotes: { type: String, default: "", maxlength: 3000 },
    expiresAt: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true },
);
schema.index({ userId: 1, createdAt: -1 });
export const SolutionRequestModel = model<SolutionRequest>(
  "SolutionRequest",
  schema,
);
