import { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in · Click Track",
};

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* ── Minimal nav ───────────────────────────────────────────────────── */}
      <nav className="flex items-center px-6 py-5">
        <Link href="/" className="font-bold text-lg text-white">
          Click<span className="text-violet-400">Track</span>
        </Link>
      </nav>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm flex flex-col gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400 mt-1">
              Track your resume views in seconds.
            </p>
          </div>

          <div className="glass rounded-3xl p-7">
            <AuthForm />
          </div>

          <p className="text-center text-xs text-slate-600">
            By continuing you agree to our{" "}
            <span className="underline cursor-pointer hover:text-slate-400 transition-colors">
              Terms
            </span>{" "}
            and{" "}
            <span className="underline cursor-pointer hover:text-slate-400 transition-colors">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
