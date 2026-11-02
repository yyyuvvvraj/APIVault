import Link from "next/link";

const links = [
  { href: "/apis", label: "Explore APIs" },
  { href: "https://github.com/yyyuvvvraj/APIVault/discussions", label: "Community", external: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="APIVault home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-indigo-950/15">A</span>
          <span className="text-lg font-extrabold tracking-tight text-slate-950">api<span className="text-indigo-600">vault</span></span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-6">
          {links.map((link) => link.external ? (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:block">
              {link.label}
            </a>
          ) : (
            <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
              {link.label}
            </Link>
          ))}
          <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">
            Suggest an API
          </a>
        </nav>
      </div>
    </header>
  );
}
