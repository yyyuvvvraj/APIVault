"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccountLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL: "/account" });
      if (result.error) { setError(result.error.message || "Unable to sign in."); return; }
      router.replace("/account"); router.refresh();
    } catch { setError("The sign-in request failed. Check your connection and try again."); }
    finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
    <div><label htmlFor="account-email" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Email address</label><input id="account-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60" /></div>
    <div><label htmlFor="account-password" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Password</label><input id="account-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60" /></div>
    <button disabled={loading || !email || !password} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50">{loading ? "Signing in…" : "Sign in to APIVault"}</button>
  </form>;
}
