# Quarantined historical runtime

This directory is a source-preserved backup of the former Next.js/Vercel/Turso
implementation. It is not a Bun workspace, production deployment target, or
scheduled-job runtime. Its `deploy` script intentionally exits non-zero and
its Wrangler files use `.legacy.*` names so normal CLI discovery cannot deploy
it by accident.

The active production system is `apps/web` (Astro + Cloudflare Pages + D1).
For recovery context and the controlled manual-recovery checklist, read
[`docs/legacy-quarantine.md`](../../docs/legacy-quarantine.md).
