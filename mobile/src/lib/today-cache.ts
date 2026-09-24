import { File, Paths } from "expo-file-system";
import type { TodayResponse } from "./api-client";

export interface CachedToday {
  data: TodayResponse;
  cachedAt: string;
}

const cacheFile = new File(Paths.document, "today-cache.json");

/**
 * Keeps the last-fetched /api/today response on-device so the screen has
 * something to show immediately on launch, before a fresh fetch resolves
 * (or if it fails — e.g. no network). Overwritten every time a fetch
 * succeeds; never the source of truth, just what's shown until the network
 * catches up.
 */
export function getCachedToday(): CachedToday | null {
  try {
    if (!cacheFile.exists) return null;
    return JSON.parse(cacheFile.textSync()) as CachedToday;
  } catch {
    return null;
  }
}

export function setCachedToday(data: TodayResponse): void {
  try {
    cacheFile.write(JSON.stringify({ data, cachedAt: new Date().toISOString() } satisfies CachedToday));
  } catch {
    // Best-effort cache — a write failure (e.g. out of disk space) shouldn't
    // affect the screen the user is actually looking at.
  }
}

/**
 * The cache is per-device, not per-user — clear it on sign-out so a
 * different account signing in next doesn't briefly show the previous
 * user's data before the first real fetch resolves.
 */
export function clearCachedToday(): void {
  try {
    if (cacheFile.exists) cacheFile.delete();
  } catch {
    // Non-fatal — worst case the next user's fetch just overwrites it.
  }
}
