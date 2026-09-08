export const USER_ROLES = ["customer", "technician", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];