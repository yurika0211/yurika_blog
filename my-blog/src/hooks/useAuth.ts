import { useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  subscribeAuthChange,
} from "../utils/auth";

export function useAuth() {
  const [session, setSession] = useState(() => getAuthSession());

  useEffect(() => {
    const unsubscribe = subscribeAuthChange(() => {
      setSession(getAuthSession());
    });
    return unsubscribe;
  }, []);

  const authState = useMemo(
    () => ({
      session,
      isLoggedIn: Boolean(session),
      username: session?.username ?? "",
      login: (username: string) => {
        setAuthSession(username);
      },
      logout: () => {
        clearAuthSession();
      },
    }),
    [session]
  );

  return authState;
}
