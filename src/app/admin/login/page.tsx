import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090c11] px-5 py-12 text-white">
      <div className="w-full max-w-[430px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-3" aria-label="Back to APIVault home">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#171c25] text-xl font-black ring-1 ring-white/10">
            <span className="text-rose-500">A</span>V
          </span>
          <span className="text-lg font-black tracking-[0.13em]">APIVAULT</span>
        </Link>

        <section className="rounded-3xl border border-white/10 bg-[#0f141d] p-7 shadow-2xl shadow-black/40 sm:p-9">
          <div className="mb-7">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-rose-400">Restricted area</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Welcome back.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to manage the API catalogue and review community submissions.</p>
          </div>
          <AdminLoginForm />
        </section>

        <p className="mt-6 text-center text-xs text-slate-600">APIVault administration · Authorized maintainers only</p>
      </div>
    </main>
  );
}
