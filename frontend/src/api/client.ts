import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

let accessToken: string | null = null;

export function setApiAccessToken(token: string | null): void {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
