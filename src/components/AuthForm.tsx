"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, emailRedirectTo: null },
          },
        });
        if (error) {
          setError(error.message);
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  const toggle = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-6">
      {/* ── Toggle ─────────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-1 flex">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={`relative flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              mode === m ? "text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-pill"
                className="absolute inset-0 bg-violet-600 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {m === "signin" ? "Sign in" : "Sign up"}
            </span>
          </button>
        ))}
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {mode === "signup" && (
            <motion.div
              key="fullname"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                required={mode === "signup"}
                className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full glass rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500/50 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={isPending}
          className="btn-neon mt-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-colors"
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : mode === "signin" ? (
            "Sign in"
          ) : (
            "Create free account"
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        {mode === "signin" ? "Don't have an account? " : "Already have one? "}
        <button
          type="button"
          onClick={toggle}
          className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
