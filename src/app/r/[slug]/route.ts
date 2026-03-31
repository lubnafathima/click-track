import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildUtmUrl, type UtmParams } from "@/types/tracker";

// ─── geo lookup ───────────────────────────────────────────────────────────────

interface GeoResult {
  country: string;
  city: string;
}

async function getGeoLocation(ip: string): Promise<GeoResult> {
  const isPrivate =
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.1") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.3");

  if (isPrivate) return { country: "local", city: "local" };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);

    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "User-Agent": "ClickTrack/1.0 (link-tracker)" },
    });
    clearTimeout(timer);

    if (!res.ok) return { country: "??", city: "??" };

    const data = (await res.json()) as Record<string, unknown>;

    return {
      country: typeof data.country_code === "string" ? data.country_code : "??",
      city:
        typeof data.city === "string"
          ? data.city
          : typeof data.region === "string"
          ? data.region
          : "??",
    };
  } catch {
    return { country: "??", city: "??" };
  }
}

// ─── stealth redirect ─────────────────────────────────────────────────────────
// /r/[slug] is the "share" URL handed to recruiters.
// It records the click and performs a bare 302 — no HTML, no branding, no body.
// Link-preview scrapers (LinkedIn, WhatsApp) follow the redirect and show the
// destination (Google Drive, GitHub, etc.) as if the tracker URL doesn't exist.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const [trackerResult, geo] = await Promise.all([
    supabase
      .from("trackers")
      .select("id, original_url, utm_params")
      .eq("short_url", slug)
      .single(),
    getGeoLocation(ip),
  ]);

  const tracker = trackerResult.data;

  if (!tracker) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await supabase.rpc("record_click", {
    p_short_url: slug,
    p_location: {
      country: geo.country,
      city: geo.city,
      timestamp: new Date().toISOString(),
    },
  });

  const destination = buildUtmUrl(
    tracker.original_url,
    tracker.utm_params as UtmParams | null
  );

  if (!/^https?:\/\//.test(destination)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // X-Robots-Tag prevents any intermediate caching proxy from indexing this URL.
  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: destination,
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
