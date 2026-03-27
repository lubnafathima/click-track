import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import type { Folder, Tracker } from "@/types/tracker";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Fetch trackers and folders in parallel.
  const [trackersResult, foldersResult] = await Promise.all([
    supabase
      .from("trackers")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("folders")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  if (trackersResult.error) {
    throw new Error(`Failed to load trackers: ${trackersResult.error.message}`);
  }

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      initialTrackers={(trackersResult.data ?? []) as Tracker[]}
      initialFolders={(foldersResult.data ?? []) as Folder[]}
    />
  );
}
