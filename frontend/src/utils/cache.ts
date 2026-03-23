const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

function getCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, ttl = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = { data, expiry: Date.now() + ttl };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable — silently ignore
  }
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    sessionStorage.clear();
    return;
  }
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k));
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = DEFAULT_TTL,
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCache(key, data, ttl);
  return data;
}
