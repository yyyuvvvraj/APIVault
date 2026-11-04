import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { ApiKeyManager } from "@/components/api-key-manager";

export const metadata: Metadata = { title: "API keys", robots: { index: false, follow: false } };

export default async function ApiKeysPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/account/login");
  const records = await getPrisma().apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, keyPrefix: true, expiresAt: true, lastUsedAt: true, revokedAt: true, createdAt: true },
  });
  const initialKeys = records.map((key) => ({
    ...key,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    revokedAt: key.revokedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
  }));
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-12 text-slate-100 sm:px-8"><div className="mx-auto max-w-4xl"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">Developer account</p><h1 className="mt-2 text-3xl font-black text-white">API keys</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Create read-only keys for identifying your integrations. Keys are shown once, stored as hashes, and use the same default request limit as anonymous traffic.</p><div className="mt-8"><ApiKeyManager initialKeys={initialKeys} /></div></div></main>;
}
