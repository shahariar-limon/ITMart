export type UserRole = "customer" | "technician" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthResult = { user: User; accessToken: string };
