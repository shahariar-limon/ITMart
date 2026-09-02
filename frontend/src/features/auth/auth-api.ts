import { apiClient } from "../../api/client";
import type { AuthResult, User } from "./types";

type ApiResponse<T> = { success: true; data: T };

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const response = await apiClient.post<ApiResponse<AuthResult>>(
    "/auth/login",
    input,
  );
  return response.data.data;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const response = await apiClient.post<ApiResponse<AuthResult>>(
    "/auth/register",
    input,
  );
  return response.data.data;
}

export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiResponse<{ user: User }>>("/auth/me");
  return response.data.data.user;
}
