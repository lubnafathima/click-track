import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildUtmUrl, type UtmParams } from "@/types/tracker";

// ─── geo lookup ───────────────────────────────────────────────────────────────

interface GeoResult {
  country: string;
  city: string;
}

async function getGeoLocation(ip: string): Promise<GeoResult> {
  // Skip geo for local/private IPs during development.
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

// ─── route handler ────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceClient();

  // 1. Fetch tracker + start geo lookup in parallel to minimise latency.
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
    // Unknown slug — redirect home rather than returning a 404.
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Atomically record the click via the DB function so concurrent hits
  //    don't clobber each other (clicks = clicks + 1, not a read-then-write).
  const clickEntry = {
    country: geo.country,
    city: geo.city,
    timestamp: new Date().toISOString(),
  };

  await supabase.rpc("record_click", {
    p_short_url: slug,
    p_location: clickEntry,
  });

  // 3. Redirect the visitor to the original URL, appending any UTM params.
  //    Use 302 so browsers don't cache and miss future counts.
  const destination = buildUtmUrl(
    tracker.original_url,
    tracker.utm_params as UtmParams | null
  );

  // Guard against non-http(s) URLs stored in the DB.
  if (!/^https?:\/\//.test(destination)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(destination, { status: 302 });
}
