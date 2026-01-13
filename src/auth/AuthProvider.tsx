import * as React from "react";
import type { StoredUser } from "@/auth/auth";
import { getStoredUser, login as doLogin, logout as doLogout } from "@/auth/auth";

type AuthContextValue = {
  user: StoredUser | null;
  login: (username: string, password: string) => Promise<StoredUser>;
  logout: () => void;
  isReady: boolean;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<StoredUser | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  // ✅ inizializzazione una volta: rilegge da localStorage
  React.useEffect(() => {
    setUser(getStoredUser());
    setIsReady(true);
  }, []);

  const login = React.useCallback(async (username: string, password: string) => {
    const u = await doLogin(username, password);
    setUser(u); // ✅ fondamentale
    return u;
  }, []);

  const logout = React.useCallback(() => {
    doLogout();
    setUser(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, login, logout, isReady }),
    [user, login, logout, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro <AuthProvider />");
  return ctx;
}
