import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import type { Tracker } from "@/types/tracker";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: trackers, error } = await supabase
    .from("trackers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Surface DB errors clearly during development.
    throw new Error(`Failed to load trackers: ${error.message}`);
  }

  return (
    <DashboardShell
      userEmail={user.email ?? ""}
      userId={user.id}
      initialTrackers={(trackers ?? []) as Tracker[]}
    />
  );
}
