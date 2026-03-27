// ─── Click location ───────────────────────────────────────────────────────────

export interface ClickLocation {
  country: string;
  city: string;
  timestamp: string;
}

// ─── UTM ─────────────────────────────────────────────────────────────────────

export type UtmTemplate = "none" | "linkedin" | "naukri" | "github" | "custom";

export interface UtmParams {
  template: UtmTemplate;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export const UTM_TEMPLATES: Record<
  UtmTemplate,
  { label: string; defaults: Partial<Record<string, string>> }
> = {
  none: { label: "None", defaults: {} },
  linkedin: {
    label: "LinkedIn Profile",
    defaults: {
      utm_source: "linkedin",
      utm_medium: "profile",
      utm_campaign: "resume",
    },
  },
  naukri: {
    label: "Naukri Job Board",
    defaults: {
      utm_source: "naukri",
      utm_medium: "job_board",
      utm_campaign: "resume",
    },
  },
  github: {
    label: "GitHub Portfolio",
    defaults: {
      utm_source: "github",
      utm_medium: "profile",
      utm_campaign: "portfolio",
    },
  },
  custom: { label: "Custom", defaults: {} },
};

/**
 * Builds the redirect destination URL by appending UTM params to the
 * original URL.  Used in both the Route Handler and the dashboard preview.
 */
export function buildUtmUrl(
  originalUrl: string,
  utm: UtmParams | null | undefined
): string {
  if (!utm || utm.template === "none") return originalUrl;
  try {
    const u = new URL(originalUrl);
    const merged: Record<string, string> = {
      ...UTM_TEMPLATES[utm.template]?.defaults,
      ...(utm.utm_source && { utm_source: utm.utm_source }),
      ...(utm.utm_medium && { utm_medium: utm.utm_medium }),
      ...(utm.utm_campaign && { utm_campaign: utm.utm_campaign }),
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    return originalUrl;
  }
}

// ─── Folder ───────────────────────────────────────────────────────────────────

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

// ─── Tracker ──────────────────────────────────────────────────────────────────

export interface Tracker {
  id: string;
  user_id: string;
  name: string;
  original_url: string;
  /** Slug only, e.g. "abc123". Full URL = `${origin}/t/${short_url}`. */
  short_url: string;
  clicks: number;
  locations: ClickLocation[];
  utm_params: UtmParams | null;
  folder_id: string | null;
  created_at: string;
}

// ─── Sparkline utility ───────────────────────────────────────────────────────

/**
 * Derives daily click counts for the last `days` days from the locations array.
 * Returns an array of length `days` ordered oldest→newest (left→right on chart).
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
