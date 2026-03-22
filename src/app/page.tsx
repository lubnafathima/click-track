"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Github, Zap, Infinity, GraduationCap, ArrowRight } from "lucide-react";
import TrackerCard from "@/components/TrackerCard";

// ─── mock demo data ────────────────────────────────────────────────────────────
const DEMO_TRACKERS = [
  {
    name: "Resume",
    views: 23,
    data: [2, 4, 3, 7, 5, 9, 8, 12, 10, 14, 11, 13, 23],
  },
  {
    name: "Portfolio",
    views: 8,
    data: [1, 0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 8],
  },
  {
    name: "GitHub",
    views: 45,
    data: [5, 8, 6, 10, 9, 14, 12, 18, 16, 22, 20, 30, 45],
  },
];

const FEATURES = [
  {
    icon: <Zap size={20} className="text-violet-400" />,
    title: "Real-time counts",
    desc: "See views update instantly — no refresh needed.",
  },
  {
    icon: <Infinity size={20} className="text-violet-400" />,
    title: "Unlimited trackers",
    desc: "Create links for every resume version, cover letter, or portfolio.",
  },
  {
    icon: <GraduationCap size={20} className="text-violet-400" />,
    title: "Student-focused",
    desc: "Built for the job hunt. No fluff, no paid tiers.",
  },
];

// ─── animation variants ────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0, 0, 0.2, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

// ─── component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-white/5">
        <span className="font-bold text-lg tracking-tight text-white">
          Click<span className="text-violet-400">Track</span>
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth"
            className="btn-neon text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center min-h-screen px-4 pt-20 pb-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto flex flex-col items-center gap-6"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-violet-300 border-violet-500/30"
          >
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            Free forever · No credit card
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08]"
          >
            Know exactly when{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
              links
            </span>{" "}
            get opened
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-slate-400 max-w-xl leading-relaxed"
          >
            Track clicks on portfolios, GitHub, Drive links, PDFs—any URL. Get{" "}
            <span className="text-slate-200 font-medium">
              real-time view counts
            </span>{" "}
            + follow-up signals.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 mt-2"
          >
            <Link
              href="/auth"
              className="btn-neon inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-7 py-3.5 rounded-2xl transition-colors text-base"
            >
              Sign up free <ArrowRight size={18} />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 glass hover:bg-white/10 text-slate-300 font-medium px-7 py-3.5 rounded-2xl transition-colors text-base"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p variants={fadeUp} className="text-xs text-slate-600">
            Trusted by students & devs during recruiting season
          </motion.p>
        </motion.div>
      </section>

      {/* ── Demo ─────────────────────────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Your links at a glance
            </h2>
            <p className="text-slate-400">
              Each tracker shows live view counts and a sparkline of activity.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {DEMO_TRACKERS.map((t, i) => (
              <TrackerCard key={t.name} {...t} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-slate-900/60">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-slate-400">
              Designed for students who just want signal, not SaaS.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                className="glass rounded-2xl p-6 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto glass rounded-3xl p-10 text-center border-violet-500/20"
        >
          <h2 className="text-3xl font-bold mb-3">Ready to stop guessing?</h2>
          <p className="text-slate-400 mb-6">
            Create your first tracker in 30 seconds. No setup, no billing.
          </p>
          <Link
            href="/auth"
            className="btn-neon inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-2xl transition-colors"
          >
            Start for free <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/5 py-8 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
        <span>Track your link &mdash; free, always.</span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-slate-300 transition-colors"
        >
          <Github size={16} />
          Open source on GitHub
        </a>
      </footer>
    </div>
  );
}
