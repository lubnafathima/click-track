"use client";

import { motion } from "framer-motion";

export function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center justify-between rounded-xl px-3 py-2.5"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-md bg-slate-700/60 animate-pulse shrink-0" />
        <div className="h-3 rounded-full bg-slate-700/60 animate-pulse flex-1 max-w-[120px]" />
      </div>
      <div className="h-3 w-5 rounded-full bg-slate-700/60 animate-pulse ml-2 shrink-0" />
    </motion.div>
  );
}

export function SkeletonSidebar() {
  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="h-2.5 w-14 rounded-full bg-slate-700/50 animate-pulse" />
        <div className="h-3 w-3 rounded bg-slate-700/50 animate-pulse" />
      </div>
      {[0, 0.07, 0.14].map((delay, i) => (
        <SkeletonRow key={i} delay={delay} />
      ))}
    </div>
  );
}
