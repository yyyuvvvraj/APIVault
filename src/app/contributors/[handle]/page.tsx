import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { toPublicContributorProfile } from "@/lib/contributors/public-profile";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPrisma().contributorProfile.findFirst({ where: { handle: handle.toLowerCase() }, select: { displayName: true } });
  return profile ? { title: `${profile.displayName} · Contributor` } : { title: "Contributor not found" };
}

export default async function ContributorPage({ params }: Props) {
  const { handle } = await params;
  const profile = await getPrisma().contributorProfile.findFirst({
    where: { handle: handle.toLowerCase(), isPublic: true },
    select: { isPublic: true, handle: true, displayName: true, bio: true, websiteUrl: true, githubUrl: true, createdAt: true, user: { select: { submissions: { where: { status: "APPROVED" }, select: { id: true } } } } },
  });
  const publicProfile = profile ? toPublicContributorProfile({ ...profile, approvedContributions: profile.user.submissions.length }) : null;
  if (!publicProfile) notFound();
  return <main className="min-h-screen bg-[#0b0c0f] px-5 py-16 text-slate-100"><div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-[#14171d] p-8"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-rose-400">APIVault contributor</p><h1 className="mt-3 text-3xl font-black text-white">{publicProfile.displayName}</h1><p className="mt-1 text-sm text-slate-500">@{publicProfile.handle}</p>{publicProfile.bio && <p className="mt-6 text-sm leading-7 text-slate-300">{publicProfile.bio}</p>}<p className="mt-6 text-xs text-slate-500">{publicProfile.approvedContributions} approved contributions · Joined {new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(publicProfile.joinedAt)}</p><div className="mt-6 flex flex-wrap gap-4 text-xs font-bold">{publicProfile.websiteUrl && <a href={publicProfile.websiteUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">Website ↗</a>}{publicProfile.githubUrl && <a href={publicProfile.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline">GitHub ↗</a>}</div><Link href="/apis" className="mt-8 inline-block text-xs font-bold text-rose-400">Explore the catalogue →</Link></div></main>;
}
