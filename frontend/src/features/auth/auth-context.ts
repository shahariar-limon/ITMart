import { createContext, useContext } from "react";
import type { AuthResult, User } from "./types";

export type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  signIn: (result: AuthResult) => void;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
