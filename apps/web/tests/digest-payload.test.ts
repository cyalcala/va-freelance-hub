import { expect, test } from "bun:test";
import { parseDigestItems } from "../src/lib/digest-payload";

const processedAt = "2026-08-09T00:00:00.000Z";

const validDigest = {
  creatorName: "Nate Herk",
  videoId: "dQw4w9WgXcQ",
  videoTitle: "Remote VA advice",
  videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  transcriptRaw: "A concise transcript.",
  actionPlan: ["Create a portfolio"],
  tags: ["VA", "freelance"],
  publishedAt: "2026-08-01",
};

test("normalizes only the allowed digest fields before a D1 insert", () => {
  expect(parseDigestItems({ items: [{ ...validDigest, id: 99, processedAt: "invalid" }] }, processedAt)).toEqual({
    ok: true,
    items: [{
      creatorName: "Nate Herk",
      videoId: "dQw4w9WgXcQ",
      videoTitle: "Remote VA advice",
      videoUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      transcriptRaw: "A concise transcript.",
      actionPlan: ["Create a portfolio"],
      tags: ["VA", "freelance"],
      publishedAt: "2026-08-01T00:00:00.000Z",
      processedAt,
    }],
  });
});

test("rejects malformed digest input before a partial write can occur", () => {
  expect(parseDigestItems({ items: [{ ...validDigest, videoUrl: "javascript:alert(1)" }] }, processedAt)).toEqual({
    ok: false,
    message: "Invalid digest item at index 0: videoUrl must be a safe public HTTP(S) URL",
  });

  expect(parseDigestItems({ items: [{ ...validDigest }, { ...validDigest, videoId: "other", tags: ["ok", 4] }] }, processedAt)).toEqual({
    ok: false,
    message: "Invalid digest item at index 1: tags must contain only non-empty strings",
  });
});
