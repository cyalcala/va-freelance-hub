// `bun run` can pass .env values to its child even with `test --no-env-file`.
// Fixture tests must never select live lake/provider clients from inherited
// credentials. Individual tests may supply their own synthetic configuration.
for (const name of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "OPENROUTER_API_KEY"]) {
  delete process.env[name];
}
