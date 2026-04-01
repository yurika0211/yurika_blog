const DEVICE_ID_STORAGE_KEY = "blog.moments.device-id";

const canUseWindow = () => typeof window !== "undefined";

const createDeviceId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getOrCreateDeviceId = () => {
  if (!canUseWindow()) {
    return "server-render-device";
  }

  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
  if (existing) {
    return existing;
  }

  const next = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
  return next;
};
