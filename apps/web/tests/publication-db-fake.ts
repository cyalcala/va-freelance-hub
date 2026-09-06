import type { PublicationDatabase, PublicationStatement } from "@va-hub/scraper";

class FakeStatement implements PublicationStatement {
  constructor(
    private readonly query: string,
    private readonly response: unknown,
    private readonly runs: Array<{ query: string; values: unknown[] }>,
    private values: unknown[] = [],
  ) {}
  bind(...values: unknown[]) { this.values = values; return this; }
  async first<T>() { return (this.response ?? null) as T | null; }
  async run() {
    this.runs.push({ query: this.query, values: this.values });
    return { success: true };
  }
}

export class FakePublicationDatabase implements PublicationDatabase {
  readonly runs: Array<{ query: string; values: unknown[] }> = [];
  constructor(private readonly responses: Record<string, unknown[]> = {}) {}
  prepare(query: string): PublicationStatement {
    const key = query.includes("FROM source_opt_outs") ? "optOut"
      : query.includes("FROM source_publication_ledger WHERE retry_key") ? "retry"
      : query.includes("SUM(published_count)") ? "tickSum"
      : query.includes("FROM source_registry") ? "registry"
      : query.includes("INSERT INTO source_publication_ledger") ? "insert"
      : query.includes("INSERT INTO source_transition_events") ? "transition"
      : "other";
    const response = this.responses[key]?.shift() ?? (key === "tickSum" ? { published: 0 } : null);
    return new FakeStatement(query, response, this.runs);
  }
}
