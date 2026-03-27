import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ClickLocation } from "@/types/tracker";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCsv(value: string): string {
  // Wrap in quotes and escape any inner quotes.
  return `"${value.replace(/"/g, '""')}"`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ trackerId: string }> }
) {
  const { trackerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // RLS ensures only the owner's tracker is returned.
  const { data: tracker, error } = await supabase
    .from("trackers")
    .select("name, locations")
    .eq("id", trackerId)
    .single();

  if (error || !tracker) {
    return new Response("Not found", { status: 404 });
  }

  const locations = (tracker.locations ?? []) as ClickLocation[];

  // Build CSV rows: header + one row per click.
  const rows: string[] = [
    ["timestamp", "country", "city"].join(","),
    ...locations.map((loc) =>
      [
        escapeCsv(loc.timestamp),
        escapeCsv(loc.country ?? ""),
        escapeCsv(loc.city ?? ""),
      ].join(",")
    ),
  ];

  const csv = rows.join("\r\n");
  const filename = `${tracker.name.replace(/[^a-z0-9_-]/gi, "_")}-clicks.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
