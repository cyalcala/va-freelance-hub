import { maxRowsPerD1Batch } from "@va-hub/scraper";

// Direct ingest writes 28 opportunity columns. Keep this declaration beside
// the route-level batch size so a future field expansion cannot reintroduce a
// D1 "too many SQL variables" failure.
export const DIRECT_INGEST_COLUMNS = 28;
export const DIRECT_INGEST_BATCH_SIZE = maxRowsPerD1Batch(DIRECT_INGEST_COLUMNS);
