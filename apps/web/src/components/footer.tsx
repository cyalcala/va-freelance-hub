export function Footer() {
  const year = 2026;
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div>
          <a href="/" className="site-brand">
            VA <span className="text-accent">&amp;</span> Freelance Hub
          </a>
          <p className="site-footer-description">
            A public index of remote opportunities and companies for Filipino
            professionals. Review the source listing for requirements and availability.
          </p>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <a href="/opportunities">Find jobs</a>
          <a href="/directory">Companies</a>
          <a href="/data-policy">Data policy</a>
          <a href="/privacy">Privacy</a>
          <a href="https://github.com/cyalcala/va-freelance-hub" target="_blank" rel="noopener noreferrer">Source code</a>
        </nav>
      </div>
      <div className="site-footer-credit">
        <p>© {year} VA &amp; Freelance Hub</p>
        <p>
          Built by{" "}
          <a href="https://www.linkedin.com/in/cyrusalcala/" target="_blank" rel="noopener noreferrer">CY Alcala</a>
        </p>
      </div>
    </footer>
  );
}
