import { Schema, model, type Types } from "mongoose";

export interface Wishlist {
  userId: Types.ObjectId;
  productIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
const wishlistSchema = new Schema<Wishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    productIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
  },
  { timestamps: true },
);
export const WishlistModel = model<Wishlist>("Wishlist", wishlistSchema);
