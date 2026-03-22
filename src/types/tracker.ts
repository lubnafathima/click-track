export interface ClickLocation {
  country: string;
  city: string;
  timestamp: string;
}

export interface Tracker {
  id: string;
  user_id: string;
  name: string;
  original_url: string;
  /** Slug only, e.g. "abc123". Full URL = `${origin}/t/${short_url}`. */
  short_url: string;
  clicks: number;
  locations: ClickLocation[];
  created_at: string;
}

/**
 * Derives daily click counts for the last `days` days from the locations array.
 * Returns an array of length `days` ordered oldest→newest (for sparkline rendering).
 */
export function buildSparklineData(
  locations: ClickLocation[] | null | undefined,
  days = 14
): number[] {
  const result = new Array<number>(days).fill(0);
  if (!locations?.length) return result;

  const now = Date.now();
  const dayMs = 86_400_000;

  for (const loc of locations) {
    const age = now - new Date(loc.timestamp).getTime();
    const dayIndex = Math.floor(age / dayMs);
    if (dayIndex >= 0 && dayIndex < days) {
      result[days - 1 - dayIndex]++;
    }
  }

  return result;
}
