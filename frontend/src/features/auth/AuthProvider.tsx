import { useMemo, useState, type PropsWithChildren } from "react";
import { setApiAccessToken } from "../../api/client";
import { AuthContext } from "./auth-context";
import type { AuthResult, User } from "./types";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      signIn: (result: AuthResult) => {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setApiAccessToken(result.accessToken);
      },
      signOut: () => {
        setUser(null);
        setAccessToken(null);
        setApiAccessToken(null);
      },
    }),
    [user, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
