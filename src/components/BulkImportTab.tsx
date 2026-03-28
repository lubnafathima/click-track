"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { importTrackersCSV } from "@/app/actions";

// ─── CSV preview types ────────────────────────────────────────────────────────

interface ParsedRow {
  name: string;
  url: string;
  folder: string;
  valid: boolean;
  error?: string;
}

interface BulkImportTabProps {
  onImported: (count: number) => void;
  onClose: () => void;
}

// ─── client-side CSV parser (for preview only) ────────────────────────────────

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

function previewCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const [name = "", url = "", folder = ""] = parseCsvLine(line);
    const trimName = name.trim();
    const trimUrl = url.trim();
    if (!trimName || !trimUrl) {
      return { name: trimName, url: trimUrl, folder: folder.trim(), valid: false, error: "Missing name or URL" };
    }
    try {
      const u = new URL(trimUrl);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      return { name: trimName, url: trimUrl, folder: folder.trim(), valid: false, error: "Invalid URL" };
    }
    return { name: trimName, url: trimUrl, folder: folder.trim(), valid: true };
  });
}

// ─── component ────────────────────────────────────────────────────────────────

const TEMPLATE_CSV = `name,original_url,folder\n"Google Drive Resume","https://drive.google.com/file/d/your-id","Applications"\n"GitHub Portfolio","https://github.com/yourname","Applications"\n"LinkedIn Profile","https://linkedin.com/in/yourname","Networking"`;

export default function BulkImportTab({ onImported, onClose }: BulkImportTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    f.text().then((text) => setRows(previewCsv(text)));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) loadFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(10);

    // Fake progress animation
    const interval = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 8 : p));
    }, 180);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await importTrackersCSV(fd);
      setProgress(100);
      setResult(res);
      if (res.created > 0) {
        setTimeout(() => onImported(res.created), 900);
      }
    } catch (err) {
      setResult({ created: 0, errors: [{ row: 0, message: err instanceof Error ? err.message : "Import failed" }] });
    } finally {
      clearInterval(interval);
      setImporting(false);
    }
  };

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors text-center ${
              dragging
                ? "border-violet-500 bg-violet-500/10"
                : "border-slate-700 hover:border-slate-500 bg-slate-800/40"
            }`}
          >
            <motion.div
              animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center"
            >
              <Upload size={22} className="text-violet-400" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-white">
                {dragging ? "Drop it!" : "Drop your CSV here"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">or click to browse</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="file-info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-3"
          >
            <FileText size={18} className="text-violet-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{file.name}</p>
              <p className="text-xs text-slate-500">
                {rows.length} rows · {validCount} valid
                {invalidCount > 0 && <span className="text-red-400"> · {invalidCount} errors</span>}
              </p>
            </div>
            <button
              onClick={() => { setFile(null); setRows([]); setResult(null); }}
              className="text-slate-500 hover:text-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview table */}
      <AnimatePresence>
        {rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">Name</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium hidden sm:table-cell">URL</th>
                    <th className="text-left px-3 py-2 text-slate-500 font-medium hidden sm:table-cell">Folder</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-700/30 last:border-0 ${
                        row.valid ? "" : "bg-red-500/5"
                      }`}
                    >
                      <td className="px-3 py-2 text-white truncate max-w-[100px]">{row.name || "—"}</td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[120px] hidden sm:table-cell">{row.url || "—"}</td>
                      <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{row.folder || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        {row.valid ? (
                          <CheckCircle2 size={13} className="text-green-400 inline" />
                        ) : (
                          <span title={row.error}>
                            <AlertCircle size={13} className="text-red-400 inline" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 5 && (
                <p className="text-xs text-slate-600 text-center py-1.5">
                  +{rows.length - 5} more rows
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bar */}
      <AnimatePresence>
        {importing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Generating your trackers…</p>
              <p className="text-xs text-violet-400 font-medium">{progress}%</p>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-600 to-purple-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
              result.created > 0
                ? "bg-green-500/10 border border-green-500/20 text-green-300"
                : "bg-red-500/10 border border-red-500/20 text-red-300"
            }`}
          >
            {result.created > 0 ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            {result.created > 0
              ? `${result.created} tracker${result.created > 1 ? "s" : ""} created!`
              : result.errors[0]?.message ?? "Import failed"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template hint */}
      {!file && (
        <button
          onClick={() => {
            const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "click-track-template.csv";
            a.click();
          }}
          className="text-xs text-slate-600 hover:text-violet-400 transition-colors text-center underline underline-offset-2"
        >
          Download CSV template
        </button>
      )}

      {/* Action buttons */}
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
          onClick={handleImport}
          disabled={!file || validCount === 0 || importing}
          className="btn-neon flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {importing ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            `Import ${validCount > 0 ? validCount : ""} trackers`
          )}
        </button>
      </div>
    </div>
  );
}
