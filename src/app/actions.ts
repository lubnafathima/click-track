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
