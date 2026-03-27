"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { X, Download, Link2 } from "lucide-react";

interface QRModalProps {
  trackerName: string;
  trackingUrl: string; // full URL: origin/t/slug
  onClose: () => void;
}

export default function QRModal({
  trackerName,
  trackingUrl,
  onClose,
}: QRModalProps) {
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = qrWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    // Draw the QR onto a new canvas with padding + branding.
    const pad = 24;
    const out = document.createElement("canvas");
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2 + 32; // extra for label
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, pad, pad);

    // Label at bottom
    ctx.fillStyle = "#6d28d9";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ClickTrack", out.width / 2, out.height - 10);

    const png = out.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = `${trackerName.replace(/[^a-z0-9]/gi, "_")}-qr.png`;
    a.click();
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="qr-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          key="qr-modal"
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          <div
            className="bg-slate-900 border border-slate-700/60 rounded-3xl p-7 w-full max-w-xs flex flex-col gap-5 items-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{trackerName}</p>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* QR code on white card */}
            <div
              ref={qrWrapRef}
              className="bg-white rounded-2xl p-4 shadow-xl"
            >
              <QRCodeCanvas
                value={trackingUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#1e1b4b"
                level="H"
              />
            </div>

            {/* URL preview */}
            <div className="flex items-center gap-2 w-full bg-black/20 rounded-xl px-3 py-2">
              <Link2 size={12} className="text-violet-400 shrink-0" />
              <span className="text-xs text-slate-400 truncate font-mono">
                {trackingUrl}
              </span>
            </div>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-3 rounded-2xl transition-colors"
            >
              <Download size={15} />
              Download PNG
            </button>

            <p className="text-xs text-slate-600 text-center">
              Add to your resume or LinkedIn — every scan is tracked.
            </p>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
