import { expect, test } from "bun:test";
import { normalizeWorkablePublishedDate } from "../../../packages/scraper/source-posting-date";
import { assessPostingFreshness } from "../../../packages/scraper/publication-freshness";
import { selectIntakeBatch, buildSourceIdsByUrl, mergeSourceIdsByUrl, sourceIdsForUrls } from "../src/lib/conditional-state";

const NOW="2026-10-18T08:00:00.000Z";
for(const raw of [null,undefined,"","2026-09-31","2026-02-29","2026-10-17T24:00:00Z",1792200000000,{},[]]){
  test(`Workable original date ${JSON.stringify(raw)} is not repaired into freshness`,()=>{
    expect(normalizeWorkablePublishedDate(raw)).toBeNull();
  });
}
test("legitimate provider calendar dates retain the accepted UTC conversion",()=>{
  expect(normalizeWorkablePublishedDate("2026-10-17")).toBe("2026-10-17T00:00:00.000Z");
  expect(normalizeWorkablePublishedDate("2024-02-29")).toBe("2024-02-29T00:00:00.000Z");
  expect(normalizeWorkablePublishedDate("2026-10-17T09:00:00+08:00")).toBe("2026-10-17T01:00:00.000Z");
});
test("freshness retains thirty-day equality and submillisecond future rejection",()=>{
  expect(assessPostingFreshness("2026-09-18T08:00:00.000Z",NOW).state).toBe("WITHIN_WINDOW");
  expect(assessPostingFreshness("2026-09-18T07:59:59.999Z",NOW).state).toBe("STALE");
  const precise=normalizeWorkablePublishedDate("2026-10-18T08:00:00.000000001Z");
  expect(precise).toBe("2026-10-18T08:00:00.000000001Z");
  expect(assessPostingFreshness(precise,NOW).state).toBe("FUTURE");
});
test("fair intake conserves selected and deferred URLs and merges ATS overflow ownership",()=>{
  const rss=Array.from({length:50},(_,i)=>({sourceId:"we-work-remotely",sourceUrl:`https://weworkremotely.com/${i}`}));
  const ats=Array.from({length:27},(_,i)=>({sourceId:"workable:hunt-st",sourceUrl:`https://apply.workable.com/j/HUNT${i}/`}));
  const first=selectIntakeBatch([...rss,...ats],50);
  expect(first.selected).toHaveLength(50);expect(first.deferred).toHaveLength(27);
  expect(first.selected.some(row=>row.sourceId==="workable:hunt-st")).toBe(true);
  expect(new Set([...first.selected,...first.deferred].map(row=>row.sourceUrl)).size).toBe(77);
  const deferred=first.deferred.filter(row=>row.sourceId==="workable:hunt-st");
  expect(selectIntakeBatch([...rss,...deferred],50).selected.filter(row=>row.sourceId==="workable:hunt-st")).toHaveLength(deferred.length);
  const ownership=buildSourceIdsByUrl([{sourceId:"we-work-remotely",items:rss}]);
  mergeSourceIdsByUrl(ownership,buildSourceIdsByUrl([{sourceId:"workable:hunt-st",items:ats}]));
  expect(sourceIdsForUrls(deferred.map(row=>row.sourceUrl),ownership)).toEqual(new Set(["workable:hunt-st"]));
});
