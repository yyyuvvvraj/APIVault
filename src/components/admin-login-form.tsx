"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AdminLoginForm({ accessError }: { accessError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password, callbackURL: "/admin" });
      if (result.error) {
        setError(result.error.message || "Unable to sign in. Check your credentials.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("The sign-in request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {accessError && <div role="alert" className="rounded border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">This account does not have administrator access.</div>}
      {error && <div role="alert" className="rounded border border-[#b20710]/40 bg-[#b20710]/15 px-4 py-3 text-sm text-red-200">{error}</div>}
      <div>
        <label htmlFor="admin-email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Email address</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-[4px] border border-white/15 bg-black/70 px-4 py-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/15" placeholder="admin@example.com" />
      </div>
      <div>
        <label htmlFor="admin-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Password</label>
        <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-[4px] border border-white/15 bg-black/70 px-4 py-4 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/15" placeholder="Your admin password" />
      </div>
      <button type="submit" disabled={loading || !email || !password}
        className="flex min-h-12 w-full items-center justify-center rounded-[4px] bg-[#e50914] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#f6121d] disabled:cursor-not-allowed disabled:opacity-50">
        {loading ? "Signing in…" : "Sign in to APIVault"}
      </button>
      <p className="text-center text-xs leading-5 text-neutral-500">Administrator accounts are provisioned by the project owner. Public sign-up is disabled.</p>
    </form>
  );
}
