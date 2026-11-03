"use client";

import { useEffect, useState, type FormEvent } from "react";

type Profile = { handle: string; displayName: string; bio: string | null; websiteUrl: string | null; githubUrl: string | null; isPublic: boolean };

export function ContributorProfileForm({ defaultName }: { defaultName: string }) {
  const [profile, setProfile] = useState<Profile>({ handle: "", displayName: defaultName, bio: "", websiteUrl: "", githubUrl: "", isPublic: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/account/profile", { cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const body = await response.json();
      if (body.data) setProfile({ ...body.data, bio: body.data.bio ?? "", websiteUrl: body.data.websiteUrl ?? "", githubUrl: body.data.githubUrl ?? "" });
    });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    try {
      const response = await fetch("/api/account/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Could not save profile.");
      setProfile({ ...body.data, bio: body.data.bio ?? "", websiteUrl: body.data.websiteUrl ?? "", githubUrl: body.data.githubUrl ?? "" });
      setMessage("Profile saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save profile."); }
    finally { setSaving(false); }
  }

  const field = "w-full rounded-lg border border-white/10 bg-[#0b0d11] px-3 py-2.5 text-sm text-white outline-none focus:border-rose-400/50";
  return <form onSubmit={save} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#14171d] p-5">
    <div><label htmlFor="profile-handle" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Public handle</label><input id="profile-handle" className={field} value={profile.handle} onChange={e=>setProfile({...profile,handle:e.target.value})} required minLength={3} maxLength={39} pattern="[A-Za-z0-9-]+" placeholder="your-handle" /></div>
    <div><label htmlFor="profile-name" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Display name</label><input id="profile-name" className={field} value={profile.displayName} onChange={e=>setProfile({...profile,displayName:e.target.value})} required maxLength={80} /></div>
    <div><label htmlFor="profile-bio" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Bio (280 characters)</label><textarea id="profile-bio" className={field} value={profile.bio ?? ""} onChange={e=>setProfile({...profile,bio:e.target.value})} maxLength={280} rows={3} /></div>
    <div><label htmlFor="profile-website" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Website URL (HTTPS)</label><input id="profile-website" className={field} value={profile.websiteUrl ?? ""} onChange={e=>setProfile({...profile,websiteUrl:e.target.value})} type="url" placeholder="https://example.com" /></div>
    <div><label htmlFor="profile-github" className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">GitHub profile URL</label><input id="profile-github" className={field} value={profile.githubUrl ?? ""} onChange={e=>setProfile({...profile,githubUrl:e.target.value})} type="url" placeholder="https://github.com/username" /></div>
    <label className="flex items-start gap-3 rounded-lg border border-white/[0.07] p-3 text-xs text-slate-300"><input type="checkbox" checked={profile.isPublic} onChange={e=>setProfile({...profile,isPublic:e.target.checked})} className="mt-0.5 accent-rose-500" /><span><strong className="block text-white">Make profile public</strong>Anyone can view the display name, handle, bio, links, and approved contribution count. Your email and account ID are never exposed.</span></label>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
    <button disabled={saving} className="rounded-lg bg-rose-600 px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Save profile"}</button>
  </form>;
}
