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
  QrCode,
  Download,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Folder,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createFolder, deleteTracker } from "@/app/actions";
import ClickChart from "./ClickChart";
import QRModal from "./QRModal";
import CreateTrackerModal from "./CreateTrackerModal";
import type { Folder as FolderType, Tracker } from "@/types/tracker";
import { buildSparklineData } from "@/types/tracker";
import Sparkline from "./Sparkline";

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
  initialFolders: FolderType[];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function DashboardShell({
  userEmail,
  userId,
  initialTrackers,
  initialFolders,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  // ── state ──────────────────────────────────────────────────────────────────
  const [trackers, setTrackers] = useState<Tracker[]>(initialTrackers);
  const [folders, setFolders] = useState<FolderType[]>(initialFolders);
  const [selected, setSelected] = useState<string | null>(
    initialTrackers[0]?.id ?? null,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // folder sidebar
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set([...initialFolders.map((f) => f.id), "uncategorized"]),
  );
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // modals
  const [showCreate, setShowCreate] = useState(false);
  const [qrTracker, setQrTracker] = useState<Tracker | null>(null);

  // delete
  const [deleting, setDeleting] = useState<string | null>(null);

  // copy
  const [copied, setCopied] = useState<string | null>(null);

  // ── realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("tracker-live")
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
                ? { ...t, clicks: updated.clicks, locations: updated.locations ?? [] }
                : t,
            ),
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, userId]);

  // ── actions ────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const folder = await createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setExpandedFolders((prev) => new Set([...prev, folder.id]));
      setNewFolderName("");
      setShowNewFolder(false);
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setCreatingFolder(false);
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
    [selected],
  );

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleExport = (trackerId: string) => {
    window.location.href = `/api/export/${trackerId}`;
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const selectedTracker = trackers.find((t) => t.id === selected) ?? null;
  const recentClicks = selectedTracker
    ? [...(selectedTracker.locations ?? [])].reverse().slice(0, 20)
    : [];
  const trackingUrl =
    typeof window !== "undefined" && selectedTracker
      ? `${window.location.origin}/t/${selectedTracker.short_url}`
      : selectedTracker
      ? `/t/${selectedTracker.short_url}`
      : "";

  // Group trackers by folder for sidebar.
  const byFolder = trackers.reduce<Record<string, Tracker[]>>((acc, t) => {
    const key = t.folder_id ?? "uncategorized";
    acc[key] = [...(acc[key] ?? []), t];
    return acc;
  }, {});

  const folderSections = [
    ...folders.map((f) => ({
      id: f.id,
      name: f.name,
      trackers: byFolder[f.id] ?? [],
    })),
    {
      id: "uncategorized",
      name: "Uncategorized",
      trackers: byFolder["uncategorized"] ?? [],
    },
  ].filter((s) => s.trackers.length > 0 || s.id !== "uncategorized");

  // ── tracker row ────────────────────────────────────────────────────────────

  const TrackerRow = ({ t }: { t: Tracker }) => (
    <button
      key={t.id}
      onClick={() => { setSelected(t.id); setSidebarOpen(false); }}
      className={`w-full text-left flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors ${
        selected === t.id
          ? "bg-violet-600/20 text-white"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
            selected === t.id ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-400"
          }`}
        >
          {t.name[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium truncate">{t.name}</span>
      </div>
      <span className={`text-xs font-semibold shrink-0 ml-2 ${selected === t.id ? "text-violet-300" : "text-slate-500"}`}>
        {t.clicks}
      </span>
    </button>
  );

  // ── sidebar ────────────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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

      {/* Folders + tracker list */}
      <div className="flex-1 overflow-y-auto py-3 px-3">
        {/* Section header */}
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Folders
          </span>
          <button
            onClick={() => setShowNewFolder((v) => !v)}
            title="New folder"
            className="text-slate-500 hover:text-violet-400 transition-colors"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        {/* New folder inline input */}
        <AnimatePresence initial={false}>
          {showNewFolder && (
            <motion.div
              key="new-folder"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateFolder();
                    if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); }
                  }}
                  autoFocus
                  placeholder="Folder name…"
                  className="flex-1 text-xs glass rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-violet-500/50 transition"
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="px-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-colors"
                >
                  {creatingFolder ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folder sections */}
        {trackers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10 px-3 leading-relaxed">
            No trackers yet.
            <br />
            Hit <span className="text-violet-400 font-medium">+</span> to create one.
          </p>
        ) : (
          <div className="space-y-1">
            {folderSections.map((section) => {
              const isExpanded = expandedFolders.has(section.id);
              return (
                <div key={section.id}>
                  {/* Folder header */}
                  <button
                    onClick={() => toggleFolder(section.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={12} className="shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="shrink-0" />
                    )}
                    <Folder size={12} className="shrink-0" />
                    <span className="text-xs font-medium truncate flex-1 text-left">
                      {section.name}
                    </span>
                    <span className="text-xs text-slate-600 shrink-0">
                      {section.trackers.length}
                    </span>
                  </button>

                  {/* Tracker rows */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="items"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden pl-3 space-y-0.5"
                      >
                        {section.trackers.map((t) => (
                          <TrackerRow key={t.id} t={t} />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User footer */}
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
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-slate-900 border-r border-slate-800">
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
              className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 35 }}
              className="fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col md:hidden"
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

        {/* Detail area */}
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
                <div className="min-w-0">
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
                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 mb-1">
                    <button
                      onClick={() => setQrTracker(selectedTracker)}
                      title="QR code"
                      className="text-slate-500 hover:text-violet-400 transition-colors"
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      onClick={() => handleExport(selectedTracker.id)}
                      title="Export CSV"
                      className="text-slate-500 hover:text-violet-400 transition-colors"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(selectedTracker.id)}
                      disabled={deleting === selectedTracker.id}
                      title="Delete tracker"
                      className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      {deleting === selectedTracker.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Sparkline (mini) ────────────────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
                  Last 14 days
                </p>
                <Sparkline
                  data={buildSparklineData(selectedTracker.locations, 14)}
                  width={540}
                  height={56}
                />
              </div>

              {/* ── Timeline chart (Recharts) ────────────────────────────── */}
              <div className="glass rounded-2xl p-5">
                <ClickChart locations={selectedTracker.locations ?? []} />
              </div>

              {/* ── Tracking link ───────────────────────────────────────── */}
              <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Tracking link
                </p>
                <div className="flex items-center gap-3 bg-black/20 rounded-xl px-4 py-3 overflow-hidden">
                  <Link2 size={14} className="text-violet-400 shrink-0" />
                  <span className="text-sm text-slate-300 truncate flex-1 font-mono">
                    {trackingUrl}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTracker.short_url)}
                    className="shrink-0 text-slate-400 hover:text-violet-300 transition-colors"
                    title="Copy"
                  >
                    {copied === selectedTracker.short_url ? (
                      <Check size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                {/* UTM badge */}
                {selectedTracker.utm_params &&
                  selectedTracker.utm_params.template !== "none" && (
                    <p className="text-xs text-violet-400 font-medium">
                      ✓ UTM params active (
                      {selectedTracker.utm_params.template})
                    </p>
                  )}
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
                          <MapPin size={12} className="text-violet-400 shrink-0" />
                          <span className="text-slate-300">
                            {loc.city !== "??" ? loc.city : "Unknown city"}
                            {loc.country &&
                              loc.country !== "??" &&
                              loc.country !== "local" && (
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
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-5 max-w-2xl mx-auto"
            >
              <div className="text-6xl select-none">✨</div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Create your first tracker
                </h2>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed mx-auto">
                  Paste your Google Drive / portfolio link and share the
                  tracking URL. Every click is counted and geolocated — live.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="btn-neon flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
                New tracker
              </button>
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

      {/* ── Create tracker modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <CreateTrackerModal
            folders={folders}
            onClose={() => setShowCreate(false)}
            onCreated={(tracker) => {
              setTrackers((prev) => [tracker, ...prev]);
              setSelected(tracker.id);
              // Ensure the new tracker's folder is expanded.
              if (tracker.folder_id) {
                setExpandedFolders((prev) => new Set([...prev, tracker.folder_id!]));
              } else {
                setExpandedFolders((prev) => new Set([...prev, "uncategorized"]));
              }
              setShowCreate(false);
              setSidebarOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── QR modal ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {qrTracker && (
          <QRModal
            trackerName={qrTracker.name}
            trackingUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}/t/${qrTracker.short_url}`
                : `/t/${qrTracker.short_url}`
            }
            onClose={() => setQrTracker(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
