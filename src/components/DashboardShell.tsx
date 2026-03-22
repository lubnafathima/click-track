"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LogOut,
  Menu,
  X,
  Link2,
  Loader2,
  Check,
  Copy,
  Trash2,
  MapPin,
  ExternalLink,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTracker, deleteTracker } from "@/app/actions";
import Sparkline from "./Sparkline";
import type { Tracker } from "@/types/tracker";
import { buildSparklineData } from "@/types/tracker";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── props ────────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  userEmail: string;
  userId: string;
  initialTrackers: Tracker[];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function DashboardShell({
  userEmail,
  userId,
  initialTrackers,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  // ── state ──────────────────────────────────────────────────────────────────
  const [trackers, setTrackers] = useState<Tracker[]>(initialTrackers);
  const [selected, setSelected] = useState<string | null>(
    initialTrackers[0]?.id ?? null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // delete
  const [deleting, setDeleting] = useState<string | null>(null);

  // copy link feedback
  const [copied, setCopied] = useState<string | null>(null);

  // ── realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("tracker-live")
      // Live click updates (fired by the /t/[slug] route handler)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trackers",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Tracker;
          setTrackers((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? {
                    ...t,
                    clicks: updated.clicks,
                    locations: updated.locations ?? [],
                  }
                : t
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // ── actions ────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url) return;

    setCreateError(null);
    setCreating(true);

    try {
      const tracker = await createTracker(name, url);
      setTrackers((prev) => [tracker, ...prev]);
      setSelected(tracker.id);
      setNewName("");
      setNewUrl("");
      setShowCreate(false);
      setSidebarOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create tracker."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      try {
        await deleteTracker(id);
        setTrackers((prev) => {
          const next = prev.filter((t) => t.id !== id);
          if (selected === id) setSelected(next[0]?.id ?? null);
          return next;
        });
      } catch (err) {
        console.error("Delete failed:", err);
      } finally {
        setDeleting(null);
      }
    },
    [selected]
  );

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const selectedTracker = trackers.find((t) => t.id === selected) ?? null;
  const recentClicks = selectedTracker
    ? [...(selectedTracker.locations ?? [])].reverse().slice(0, 20)
    : [];

  // ── sidebar ────────────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + close (mobile) */}
      <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
        <span className="font-bold text-base text-white">
          Click<span className="text-violet-400">Track</span>
        </span>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Tracker list */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {trackers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10 px-3 leading-relaxed">
            No trackers yet.
            <br />
            Hit{" "}
            <span className="text-violet-400 font-medium">+</span> to create
            one.
          </p>
        ) : (
          trackers.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left flex items-center justify-between rounded-xl px-3 py-3 transition-colors ${
                selected === t.id
                  ? "bg-violet-600/20 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    selected === t.id
                      ? "bg-violet-600 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {t.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">{t.name}</span>
              </div>
              <span
                className={`text-xs font-semibold shrink-0 ml-2 ${
                  selected === t.id ? "text-violet-300" : "text-slate-500"
                }`}
              >
                {t.clicks}
              </span>
            </button>
          ))
        )}
      </div>

      {/* User + sign-out */}
      <div className="px-4 py-4 border-t border-white/5 flex items-center justify-between gap-2 shrink-0">
        <p className="text-xs text-slate-400 truncate min-w-0">{userEmail}</p>
        <button
          onClick={handleSignOut}
          title="Sign out"
          className="shrink-0 text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 glass border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/60 md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 35 }}
              className="fixed inset-y-0 left-0 z-40 w-72 glass border-r border-white/5 flex flex-col md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>
          <span className="font-bold text-white">
            Click<span className="text-violet-400">Track</span>
          </span>
        </div>

        {/* Scrollable detail area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
          {selectedTracker ? (
            <motion.div
              key={selectedTracker.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="max-w-2xl flex flex-col gap-6"
            >
              {/* ── Header ──────────────────────────────────────────────── */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {selectedTracker.name}
                  </h1>
                  <a
                    href={selectedTracker.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-violet-400 transition-colors mt-1 truncate max-w-xs"
                  >
                    <ExternalLink size={11} />
                    {selectedTracker.original_url}
                  </a>
                </div>
                <div className="flex items-end gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-4xl font-extrabold text-white tabular-nums">
                      {selectedTracker.clicks}
                    </span>
                    <p className="text-xs text-slate-400">total clicks</p>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedTracker.id)}
                    disabled={deleting === selectedTracker.id}
                    title="Delete tracker"
                    className="mb-1 text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deleting === selectedTracker.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* ── Sparkline ───────────────────────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">
                  Activity — last 14 days
                </p>
                <Sparkline
                  data={buildSparklineData(selectedTracker.locations, 14)}
                  width={540}
                  height={72}
                />
                <div className="flex justify-between mt-2 text-xs text-slate-600">
                  <span>14 days ago</span>
                  <span>Today</span>
                </div>
              </div>

              {/* ── Tracking link ───────────────────────────────────────── */}
              <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Your tracking link
                </p>
                <div className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3 overflow-hidden">
                  <Link2 size={14} className="text-violet-400 shrink-0" />
                  <span className="text-sm text-slate-300 truncate flex-1 font-mono">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/t/${selectedTracker.short_url}`
                      : `/t/${selectedTracker.short_url}`}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTracker.short_url)}
                    className="shrink-0 text-slate-400 hover:text-violet-300 transition-colors"
                    title="Copy tracking link"
                  >
                    {copied === selectedTracker.short_url ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Share this instead of your direct URL — every visit is
                  counted and geolocated.
                </p>
              </div>

              {/* ── Recent clicks ────────────────────────────────────────── */}
              {recentClicks.length > 0 && (
                <div className="glass rounded-2xl p-5 flex flex-col gap-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Recent clicks
                  </p>
                  <div className="flex flex-col gap-2">
                    {recentClicks.map((loc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={13} className="text-violet-400 shrink-0" />
                          <span className="text-slate-300">
                            {loc.city !== "??" ? loc.city : "Unknown city"}
                            {loc.country && loc.country !== "??" && loc.country !== "local" && (
                              <span className="text-slate-500">
                                {" "}· {loc.country}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock size={11} />
                          {timeAgo(loc.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center gap-4 py-24"
            >
              <div className="text-5xl select-none">✨</div>
              <h2 className="text-xl font-semibold text-white">
                Click + to create your first tracker
              </h2>
              <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                Paste your Google Drive / portfolio link, share the tracker URL,
                and watch views roll in — with country data.
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        animate={{
          boxShadow: [
            "0 0 16px rgba(139,92,246,0.4)",
            "0 0 28px rgba(139,92,246,0.7)",
            "0 0 16px rgba(139,92,246,0.4)",
          ],
        }}
        transition={{
          boxShadow: { repeat: Infinity, duration: 2.4, ease: "easeInOut" },
        }}
        onClick={() => setShowCreate(true)}
        aria-label="Create new tracker"
        className="fixed bottom-7 right-7 z-20 w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl flex items-center justify-center shadow-xl transition-colors"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              key="modal-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCreate(false);
                setCreateError(null);
              }}
              className="fixed inset-0 z-50 bg-black/60"
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
            >
              <div
                className="glass rounded-3xl p-7 w-full max-w-sm flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">New tracker</h2>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError(null);
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Resume — Google"
                    autoFocus
                    className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                  />
                </div>

                {/* Original URL */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Destination URL
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="https://drive.google.com/file/..."
                    className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                  />
                  <p className="text-xs text-slate-600 mt-1.5">
                    Visitors who open your tracker link get redirected here.
                  </p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {createError && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
                    >
                      {createError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setCreateError(null);
                    }}
                    className="flex-1 py-3 rounded-2xl glass text-slate-400 hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newUrl.trim() || creating}
                    className="btn-neon flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {creating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
