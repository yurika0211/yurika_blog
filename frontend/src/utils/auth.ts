import { normalizeDisplayName } from "./displayName";

const AUTH_CHANGED_EVENT = "blog-auth-changed";

export interface AuthSession {
  username: string;
  loginAt: string;
  token: string;
}

const canUseWindow = () => typeof window !== "undefined";
let authSession: AuthSession | null = null;

const emitAuthChanged = () => {
  if (!canUseWindow()) {
    return;
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const getAuthSession = (): AuthSession | null => {
  if (!canUseWindow()) {
    return null;
  }

  return authSession;
};

export const isAuthenticated = () => Boolean(getAuthSession());

export const getAuthToken = (): string | null => {
  const session = getAuthSession();
  return session?.token || null;
};

export const setAuthSession = (username: string, token: string) => {
  if (!canUseWindow()) {
    return;
  }

  const safeUsername = normalizeDisplayName(username, "user");
  const safeToken = token.trim();
  if (!safeToken) {
    return;
  }
  const session: AuthSession = {
    username: safeUsername,
    loginAt: new Date().toISOString(),
    token: safeToken,
  };

  authSession = session;
  emitAuthChanged();
};

export const clearAuthSession = () => {
  if (!canUseWindow()) {
    return;
  }

  authSession = null;
  emitAuthChanged();
};

export const subscribeAuthChange = (listener: () => void) => {
  if (!canUseWindow()) {
    return () => undefined;
  }

  const onCustom = () => {
    listener();
  };

  window.addEventListener(AUTH_CHANGED_EVENT, onCustom);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, onCustom);
  };
};
