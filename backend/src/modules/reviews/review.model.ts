import { Schema, model, type Types } from "mongoose";

export interface Review {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  rating: number;
  text: string;
  verifiedPurchase: true;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<Review>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 2000,
    },
    verifiedPurchase: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, createdAt: -1 });
export const ReviewModel = model<Review>("Review", reviewSchema);
