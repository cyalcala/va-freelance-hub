import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-zinc-100 tracking-tight hover:text-white transition-colors">
          Remote<span className="text-accent">PH</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/opportunities">Jobs</NavLink>
          <NavLink href="/directory">Directory</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-subtle transition-colors"
    >
      {children}
    </Link>
  );
}
