"use client";

import { motion } from "framer-motion";
import { Eye, ExternalLink } from "lucide-react";
import Sparkline from "./Sparkline";

export interface TrackerCardProps {
  name: string;
  views: number;
  data: number[];
  url?: string;
  index?: number;
}

export default function TrackerCard({
  name,
  views,
  data,
  url,
  index = 0,
}: TrackerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12, ease: "easeOut" }}
      className="glass rounded-2xl p-5 flex flex-col gap-3 hover:border-violet-500/40 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {name}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-white">{views}</span>
            <span className="text-sm text-slate-400">views</span>
          </div>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-violet-400 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>

      <Sparkline data={data} width={200} height={40} />

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Eye size={12} />
        <span>Last 7 days</span>
      </div>
    </motion.div>
  );
}
