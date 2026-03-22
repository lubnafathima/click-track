"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Tracker } from "@/types/tracker";

/** Generates a cryptographically random 8-char alphanumeric slug. */
function generateSlug(): string {
  const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export async function createTracker(
  name: string,
  originalUrl: string
): Promise<Tracker> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Validate URL
  try {
    const u = new URL(originalUrl);
    if (!["http:", "https:"].includes(u.protocol)) {
      throw new Error();
    }
  } catch {
    throw new Error("Please provide a valid http(s) URL.");
  }

  // Attempt insert up to 3 times to handle slug collisions.
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
      })
      .select()
      .single();

    if (error?.code === "23505") continue; // unique constraint — retry
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
    .eq("user_id", user.id); // belt-and-suspenders: RLS handles this, but be explicit

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
