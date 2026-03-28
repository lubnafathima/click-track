"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Folder, Tracker, UtmParams } from "@/types/tracker";

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateSlug(): string {
  const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

// ─── trackers ────────────────────────────────────────────────────────────────

export async function createTracker(
  name: string,
  originalUrl: string,
  utmParams?: UtmParams | null,
  folderId?: string | null
): Promise<Tracker> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  try {
    const u = new URL(originalUrl);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error();
  } catch {
    throw new Error("Please provide a valid http(s) URL.");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();

    const { data, error } = await supabase
      .from("trackers")
      .insert({
        user_id: user.id,
        name: name.trim(),
        original_url: originalUrl.trim(),
        short_url: slug,
        clicks: 0,
        locations: [],
        utm_params: utmParams?.template === "none" ? null : (utmParams ?? null),
        folder_id: folderId ?? null,
      })
      .select()
      .single();

    if (error?.code === "23505") continue;
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    return data as Tracker;
  }

  throw new Error("Could not generate a unique slug. Please try again.");
}

export async function deleteTracker(id: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("trackers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ─── folders ──────────────────────────────────────────────────────────────────

export async function createFolder(name: string): Promise<Folder> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  return data as Folder;
}

// ─── bulk CSV import ──────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === "," && !inQuotes) {
      fields.push(current); current = "";
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

export async function importTrackersCSV(
  formData: FormData
): Promise<{ created: number; errors: Array<{ row: number; message: string }> }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided");

  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const dataLines = lines.slice(1);
  const rows = dataLines.map(parseCsvLine);

  // Collect unique non-empty folder names
  const folderNames = [...new Set(rows.map((r) => r[2]?.trim()).filter(Boolean))];

  // Fetch existing folders for this user
  const { data: existingFolders } = await supabase
    .from("folders")
    .select("id, name")
    .eq("user_id", user.id);

  const folderMap: Record<string, string> = {};
  for (const f of existingFolders ?? []) {
    folderMap[f.name.toLowerCase()] = f.id;
  }

  // Auto-create any missing folders
  for (const name of folderNames) {
    if (!folderMap[name.toLowerCase()]) {
      const { data } = await supabase
        .from("folders")
        .insert({ user_id: user.id, name })
        .select("id, name")
        .single();
      if (data) folderMap[data.name.toLowerCase()] = data.id;
    }
  }

  let created = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const [rawName = "", rawUrl = "", rawFolder = ""] = rows[i];
    const rowNum = i + 2;
    const name = rawName.trim();
    const originalUrl = rawUrl.trim();

    if (!name || !originalUrl) {
      errors.push({ row: rowNum, message: "Missing name or URL" });
      continue;
    }

    try {
      const u = new URL(originalUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      errors.push({ row: rowNum, message: `Invalid URL: ${originalUrl}` });
      continue;
    }

    const folderId = rawFolder.trim()
      ? (folderMap[rawFolder.trim().toLowerCase()] ?? null)
      : null;

    let inserted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = generateSlug();
      const { error } = await supabase.from("trackers").insert({
        user_id: user.id,
        name,
        original_url: originalUrl,
        short_url: slug,
        clicks: 0,
        locations: [],
        utm_params: null,
        folder_id: folderId,
      });
      if (error?.code === "23505") continue;
      if (error) { errors.push({ row: rowNum, message: error.message }); break; }
      created++;
      inserted = true;
      break;
    }
    if (!inserted && !errors.find((e) => e.row === rowNum)) {
      errors.push({ row: rowNum, message: "Could not generate unique slug" });
    }
  }

  revalidatePath("/dashboard");
  return { created, errors };
}

export async function deleteFolder(id: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Trackers with this folder_id get SET NULL by the FK constraint.
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
