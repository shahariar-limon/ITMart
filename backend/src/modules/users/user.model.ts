import { Schema, model } from "mongoose";

export const USER_ROLES = ["customer", "technician", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  scheduleVersion: number;
  accountType: "personal" | "business";
  businessDiscountBps: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
    scheduleVersion: {
      type: Number,
      default: 0,
      required: true,
      select: false,
    },
    accountType: {
      type: String,
      enum: ["personal", "business"],
      default: "personal",
      required: true,
    },
    businessDiscountBps: {
      type: Number,
      default: 0,
      min: 0,
      max: 5000,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, value) => {
        const safeValue = value as Record<string, unknown>;
        delete safeValue.passwordHash;
        return value;
      },
    },
  },
);

export const UserModel = model<User>("User", userSchema);
