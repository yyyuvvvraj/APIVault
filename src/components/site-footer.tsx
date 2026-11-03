import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#090a0d]">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p><span className="font-black tracking-wide text-slate-200">APIVault</span> · A community-built API directory.</p>
        <div className="flex flex-wrap gap-5">
          <Link href="/apis" className="transition hover:text-white">Explore</Link>
          <a href="https://github.com/yyyuvvvraj/APIVault" target="_blank" rel="noreferrer" className="transition hover:text-white">GitHub</a>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="transition hover:text-white">Contributing</a>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/LICENSE" target="_blank" rel="noreferrer" className="transition hover:text-white">MIT License</a>
        </div>
      </div>
    </footer>
  );
}
