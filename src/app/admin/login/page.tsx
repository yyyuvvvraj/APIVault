import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const accessError = params.error === "not-authorized";

  return (
    <main className="av-admin-login relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-5 py-12 text-white">
      <div className="pointer-events-none absolute -right-40 top-[-10rem] h-[600px] w-[600px] rounded-full border-[80px] border-[#e50914]/[0.055]" />
      <div className="pointer-events-none absolute left-[-12rem] bottom-[-18rem] h-[520px] w-[520px] rounded-full bg-[#e50914]/[0.09] blur-[140px]" />
      <div className="relative z-10 w-full max-w-[440px]">
        <Link href="/" className="mb-9 inline-flex items-center gap-3" aria-label="Back to APIVault home">
          <span className="text-[30px] font-black tracking-[-0.09em]"><span className="text-[#e50914]">API</span>VAULT</span>
        </Link>
        <section className="rounded-md border border-white/10 bg-[#141414]/95 p-7 shadow-2xl shadow-black/50 backdrop-blur sm:p-9">
          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e50914]">Restricted area</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight">Welcome back.</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400">Sign in to manage the API catalogue and review community submissions.</p>
          </div>
          <AdminLoginForm accessError={accessError} />
        </section>
        <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">APIVault administration · Authorized maintainers only</p>
      </div>
    </main>
  );
}
