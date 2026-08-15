/**
 * Cloudflare Workers runtime shim for `FinalizationRegistry` / `WeakRef`.
 *
 * Inngest v4's OpenTelemetry tracing (`InngestMetadataSpanProcessor`) constructs
 * a `FinalizationRegistry` at initialization. The Workers runtime this Pages
 * project targets (compat 2024-11-01 + nodejs_compat) does NOT expose
 * `FinalizationRegistry`, so `serve()` threw `ReferenceError: FinalizationRegistry
 * is not defined` and `/api/inngest` returned a bare 500 — before the signing key
 * was ever consulted. Confirmed from live production Function logs 2026-08-15.
 *
 * Unit tests run under Bun, which HAS these globals, so the gap only surfaced at
 * runtime on Workers — exactly the class of failure the Inngest doc flagged as
 * "runtime-unverifiable until deployed".
 *
 * Workers are short-lived and GC finalizers never fire deterministically, so a
 * no-op registry is behaviorally safe: Inngest flushes its spans per invocation
 * and the isolate is torn down regardless. This module MUST be imported before
 * any `inngest` module so the global exists before the span processor runs.
 */
const globalScope = globalThis as unknown as {
  FinalizationRegistry?: unknown;
  WeakRef?: unknown;
};

if (typeof globalScope.FinalizationRegistry === "undefined") {
  globalScope.FinalizationRegistry = class FinalizationRegistry<T> {
    constructor(_cleanupCallback: (heldValue: T) => void) {}
    register(_target: object, _heldValue: T, _unregisterToken?: object): void {}
    unregister(_unregisterToken: object): boolean {
      return false;
    }
  };
}

if (typeof globalScope.WeakRef === "undefined") {
  globalScope.WeakRef = class WeakRef<T extends object> {
    private readonly value: T;
    constructor(value: T) {
      this.value = value;
    }
    deref(): T | undefined {
      return this.value;
    }
  };
}

export {};
