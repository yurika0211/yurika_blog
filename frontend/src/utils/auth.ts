export const AUTH_STORAGE_KEY = "blog.auth.session";
const AUTH_CHANGED_EVENT = "blog-auth-changed";

export interface AuthSession {
  username: string;
  loginAt: string;
}

const canUseWindow = () => typeof window !== "undefined";

const parseSession = (raw: string | null): AuthSession | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    const username = typeof parsed.username === "string" ? parsed.username.trim() : "";
    const loginAt = typeof parsed.loginAt === "string" ? parsed.loginAt : "";
    if (!username || !loginAt) {
      return null;
    }
    return { username, loginAt };
  } catch {
    return null;
  }
};

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

  return parseSession(window.localStorage.getItem(AUTH_STORAGE_KEY));
};

export const isAuthenticated = () => Boolean(getAuthSession());

export const setAuthSession = (username: string) => {
  if (!canUseWindow()) {
    return;
  }

  const safeUsername = username.trim() || "user";
  const session: AuthSession = {
    username: safeUsername,
    loginAt: new Date().toISOString(),
  };

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  emitAuthChanged();
};

export const clearAuthSession = () => {
  if (!canUseWindow()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  emitAuthChanged();
};

export const subscribeAuthChange = (listener: () => void) => {
  if (!canUseWindow()) {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY) {
      listener();
    }
  };
  const onCustom = () => {
    listener();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(AUTH_CHANGED_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(AUTH_CHANGED_EVENT, onCustom);
  };
};
