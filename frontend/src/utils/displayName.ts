export const normalizeDisplayName = (
  value: string | null | undefined,
  fallback = "Anonymous user",
) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.toLowerCase() === "admin") {
    return "yurika";
  }

  return trimmed;
};
