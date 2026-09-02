import { Schema, model } from "mongoose";

export interface Category {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<Category>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const CategoryModel = model<Category>("Category", categorySchema);
