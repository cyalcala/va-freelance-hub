/**
 * Keep this cache in an imported module, never in Astro page frontmatter:
 * frontmatter executes inside the component function on every request.
 * Coalesce concurrent loads, expire successful data, and never cache failures.
 */
export function createTimedDataCache<T>(ttlMs: number, now = Date.now) {
  let entry: { value: T; expiresAt: number } | undefined;
  let pending: Promise<T> | undefined;

  return (load: () => Promise<T>): Promise<T> => {
    if (entry && entry.expiresAt > now()) return Promise.resolve(entry.value);
    if (pending) return pending;

    pending = Promise.resolve().then(load).then((value) => {
      entry = { value, expiresAt: now() + ttlMs };
      return value;
    }).finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
