export function Footer() {
  const year = 2026;
  return (
    <footer className="py-12">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink text-parchment font-extrabold text-base">V</span>
            <span className="text-lg font-extrabold tracking-tight text-ink">
              VA <span className="text-accent">&amp;</span> Freelance Hub
            </span>
          </a>
          <p className="mt-3 text-sm text-ink/55 leading-relaxed">
            A self-updating home for remote and VA-friendly work that hires
            Filipino talent — curated from trusted job boards, refreshed
            automatically, always free.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-overline text-ink/40 mb-1">Explore</span>
            <a href="/opportunities" className="text-ink/60 hover:text-accent transition-colors">Browse jobs</a>
            <a href="/directory" className="text-ink/60 hover:text-accent transition-colors">Agency directory</a>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-overline text-ink/40 mb-1">About</span>
            <a href="/data-policy" className="text-ink/60 hover:text-accent transition-colors">Data policy</a>
            <a href="/privacy" className="text-ink/60 hover:text-accent transition-colors">Privacy</a>
            <a href="https://github.com/cyalcala/va-freelance-hub" target="_blank" rel="noopener noreferrer" className="text-ink/60 hover:text-accent transition-colors">Source code</a>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-ink/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink/45">
        <p>© {year} VA &amp; Freelance Hub · Self-updating on Cloudflare Edge</p>
        <p>
          Crafted by{" "}
          <a href="https://www.linkedin.com/in/cyrusalcala/" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink/60 hover:text-accent transition-colors">
            CY Alcala
          </a>
        </p>
      </div>
    </footer>
  );
}
