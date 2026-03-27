# VA.INDEX Titanium Branch Protection Strategy

To ensure that the **Turso Edge Database** is never accidentally dropped or corrupted, follow these **DevSecOps Invariants**.

## 1. GitHub Branch Protection Rules
Configure the following for the `main` branch in **Settings > Branches**:

> [!IMPORTANT]
> **Require Pull Request Reviews**: 
> Set to at least 1 approval. This prevents a single person from pushing a "Rogue Migration" that could drop tables.

> [!IMPORTANT]
> **Require Status Checks to Pass**:
> Select the following jobs:
> - `🛑 Invariant Suite Validation` (from `trigger-deploy.yml`)
> - `🛡️ Schema Integrity Check` (from `verify-migration.yml`)
> This ensures that code only reaches `main` if it is logically sound and the schema matches its migrations.

> [!CAUTION]
> **Permit Force Pushes**: **DISABLED**.
> **Allow Deletions**: **DISABLED**.

---

## 2. The Drizzle Migration Law
To prevent data loss, the VA.INDEX platform follows the **Local-Generate, Remote-Migrate** pattern:

1.  **NEVER** use `drizzle-kit push` in a GitHub Action. `push` is designed for prototyping and can silently drop columns or tables to match the schema.
2.  **ALWAYS** use `drizzle-kit generate` locally. Inspect the generated SQL file in `packages/db/migrations` to ensure no `DROP TABLE` or `DROP COLUMN` statements exist.
3.  **CI VERIFICATION**: My newly created `verify-migration.yml` workflow will block any PR where `schema.ts` has been changed but no matching migration file was generated.
4.  **CD EXECUTION**: Database migrations should be run via a dedicated `db:migrate` script (using `drizzle-orm/libsql/migrator`) during the **Deploy** job, *after* the invariant suite passes.

---

## 3. Disaster Recovery (The Last Stand)
- **Turso Backups**: Ensure Turso point-in-time recovery (PITR) is enabled.
- **Lock-File**: If a migration is suspected to be destructive, use the `vitals` table `lock_status: 'LOCKED'` mentioned in our `schema.ts` to manually halt all harvesters before merging.

**Result: ZEOR-DATA-LOSS GUARANTEE.** 🛡️✅
