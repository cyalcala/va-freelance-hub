export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <p>
          Built by{" "}
          <a
            href="https://github.com/cyalcala"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            cyalcala
          </a>{" "}
          — Filipino freelance technical writer &amp; agentic engineer
        </p>
        <p className="font-mono">
          Self-updates via{" "}
          <a
            href="https://cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cloudflare
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/cyalcala/va-freelance-hub"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Source
          </a>
          {" "}·{" "}
          <a
            href="/privacy"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Privacy
          </a>
          {" "}·{" "}
          <a
            href="/data-policy"
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Data Policy
          </a>
        </p>
      </div>
    </footer>
  );
}
