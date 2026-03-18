const DEFAULT_BACKEND_PORT = "3001";

const browserDefaultBaseUrl = () => {
  if (typeof window === "undefined") {
    return `http://localhost:${DEFAULT_BACKEND_PORT}`;
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  browserDefaultBaseUrl();
