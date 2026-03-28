"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ChevronDown } from "lucide-react";
import { createTracker } from "@/app/actions";
import type { Folder, Tracker, UtmParams, UtmTemplate } from "@/types/tracker";
import { UTM_TEMPLATES, buildUtmUrl } from "@/types/tracker";
import BulkImportTab from "./BulkImportTab";

type Tab = "single" | "bulk";

// ─── props ────────────────────────────────────────────────────────────────────

interface CreateTrackerModalProps {
  folders: Folder[];
  onClose: () => void;
  onCreated: (tracker: Tracker) => void;
  onBulkImported?: (count: number) => void;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CreateTrackerModal({
  folders,
  onClose,
  onCreated,
  onBulkImported,
}: CreateTrackerModalProps) {
  const [tab, setTab] = useState<Tab>("single");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState<string>("");       // "" = Uncategorized
  const [utmTemplate, setUtmTemplate] = useState<UtmTemplate>("none");
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [customCampaign, setCustomCampaign] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── derived UTM preview ──────────────────────────────────────────────────────

  const utmParams: UtmParams | null =
    utmTemplate === "none"
      ? null
      : utmTemplate === "custom"
      ? {
          template: "custom",
          utm_source: customSource || undefined,
          utm_medium: customMedium || undefined,
          utm_campaign: customCampaign || undefined,
        }
      : { template: utmTemplate };

  const previewUrl =
    url.trim() && utmParams ? buildUtmUrl(url.trim(), utmParams) : url.trim();

  // ── submit ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) return;

    setError(null);
    setCreating(true);

    try {
      const tracker = await createTracker(
        trimName,
        trimUrl,
        utmParams,
        folderId || null
      );
      onCreated(tracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tracker.");
    } finally {
      setCreating(false);
    }
  };

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="modal-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
      >
        <div
          className="bg-slate-900 border border-slate-700/60 rounded-3xl p-7 w-full max-w-sm flex flex-col gap-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">New tracker</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-slate-800/60 rounded-xl p-1 flex gap-1">
            {(["single", "bulk"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  tab === t ? "text-white" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === t && (
                  <motion.span
                    layoutId="modal-tab-pill"
                    className="absolute inset-0 bg-violet-600 rounded-lg"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {t === "single" ? "Single" : "Bulk CSV"}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "bulk" ? (
              <motion.div
                key="bulk"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <BulkImportTab
                  onImported={(count) => { onBulkImported?.(count); onClose(); }}
                  onClose={onClose}
                />
              </motion.div>
            ) : (
              <motion.div
                key="single"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-5"
              >

          {/* Name */}
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Resume — Google Drive"
              autoFocus
              className="input-glass"
            />
          </Field>

          {/* URL */}
          <Field label="Destination URL">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/file/..."
              className="input-glass"
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Visitors who click your tracker link get redirected here.
            </p>
          </Field>

          {/* Folder */}
          {folders.length > 0 && (
            <Field label="Folder">
              <SelectWrapper>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="input-glass appearance-none pr-8 cursor-pointer"
                >
                  <option value="">Uncategorized</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </SelectWrapper>
            </Field>
          )}

          {/* UTM Template */}
          <Field label="UTM Template">
            <SelectWrapper>
              <select
                value={utmTemplate}
                onChange={(e) => setUtmTemplate(e.target.value as UtmTemplate)}
                className="input-glass appearance-none pr-8 cursor-pointer"
              >
                {(Object.keys(UTM_TEMPLATES) as UtmTemplate[]).map((k) => (
                  <option key={k} value={k}>
                    {UTM_TEMPLATES[k].label}
                  </option>
                ))}
              </select>
            </SelectWrapper>
          </Field>

          {/* Custom UTM fields */}
          <AnimatePresence initial={false}>
            {utmTemplate === "custom" && (
              <motion.div
                key="custom-utm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col gap-3"
              >
                <input
                  type="text"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="utm_source (e.g. linkedin)"
                  className="input-glass text-xs"
                />
                <input
                  type="text"
                  value={customMedium}
                  onChange={(e) => setCustomMedium(e.target.value)}
                  placeholder="utm_medium (e.g. profile)"
                  className="input-glass text-xs"
                />
                <input
                  type="text"
                  value={customCampaign}
                  onChange={(e) => setCustomCampaign(e.target.value)}
                  placeholder="utm_campaign (e.g. resume)"
                  className="input-glass text-xs"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* UTM preview */}
          <AnimatePresence initial={false}>
            {utmTemplate !== "none" && url.trim() && (
              <motion.div
                key="utm-preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-black/20 rounded-xl p-3"
              >
                <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">
                  Redirect preview
                </p>
                <p className="text-xs text-violet-300 break-all font-mono leading-relaxed">
                  {previewUrl}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || !url.trim() || creating}
              className="btn-neon flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {creating ? (
                <>
                  <motion.span
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </button>
          </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

// ─── micro helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
    </div>
  );
}
