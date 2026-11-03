import Link from "next/link";

const links = [
  { href: "/apis", label: "Explore APIs" },
  { href: "https://github.com/yyyuvvvraj/APIVault/discussions", label: "Community", external: true },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0b0c0f]/95 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="APIVault home">
          <span className="text-xl font-black tracking-[-0.08em]"><span className="text-rose-500">API</span><span className="text-white">VAULT</span></span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-6">
          {links.map((link) => link.external ? (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="hidden text-xs font-semibold text-slate-400 transition hover:text-white sm:block">{link.label}</a>
          ) : (
            <Link key={link.href} href={link.href} className="text-xs font-semibold text-slate-400 transition hover:text-white">{link.label}</Link>
          ))}
          <a href="https://github.com/yyyuvvvraj/APIVault/issues/new?template=api_submission.yml" target="_blank" rel="noreferrer" className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-rose-500">Submit API</a>
        </nav>
      </div>
    </header>
  );
}
