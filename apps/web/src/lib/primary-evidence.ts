/** Read primary documentation for content hashing, never URL/timestamp hashing. */
export async function fetchPrimaryEvidence(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const response = await fetchImpl(url, {
    // Workers accepts manual/follow only. Reject 3xx through the HTTP gate below.
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "va-freelance-hub-evidence/1.0" },
  });
  if (!response.ok) throw new Error(`Primary evidence HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Primary evidence has no body");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let content = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw new Error("Primary evidence exceeds 2 MiB budget");
      content += decoder.decode(chunk.value, { stream: true });
    }
    content += decoder.decode();
    if (!content.trim()) throw new Error("Primary evidence is empty");
    return content;
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
