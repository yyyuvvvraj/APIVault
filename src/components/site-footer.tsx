import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p><span className="font-bold text-slate-900">APIVault</span> · A community-built API directory.</p>
        <div className="flex flex-wrap gap-5">
          <Link href="/apis" className="hover:text-indigo-700">Explore</Link>
          <a href="https://github.com/yyyuvvvraj/APIVault" target="_blank" rel="noreferrer" className="hover:text-indigo-700">GitHub</a>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="hover:text-indigo-700">Contributing</a>
          <a href="https://github.com/yyyuvvvraj/APIVault/blob/dev/LICENSE" target="_blank" rel="noreferrer" className="hover:text-indigo-700">MIT License</a>
        </div>
      </div>
    </footer>
  );
}
