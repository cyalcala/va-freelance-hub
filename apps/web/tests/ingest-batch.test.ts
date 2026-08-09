import { expect, test } from "bun:test";
import { chunkArray } from "@va-hub/scraper";
import { DIRECT_INGEST_BATCH_SIZE, DIRECT_INGEST_COLUMNS } from "../src/lib/ingest-batch";

test("direct ingest stays below D1's bind-variable limit", () => {
  expect(DIRECT_INGEST_COLUMNS).toBe(28);
  expect(DIRECT_INGEST_BATCH_SIZE).toBe(3);
  expect(chunkArray([1, 2, 3, 4], DIRECT_INGEST_BATCH_SIZE)).toEqual([[1, 2, 3], [4]]);
  expect(chunkArray(Array.from({ length: 10 }, (_, index) => index), DIRECT_INGEST_BATCH_SIZE)
    .map((chunk) => chunk.length)).toEqual([3, 3, 3, 1]);
});
