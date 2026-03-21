import { performance } from "perf_hooks";

const HN_API = "https://hacker-news.firebaseio.com/v0";

// Mock the response of user/whoishiring.json
async function mockFetch(url: string, opts?: any) {
  if (url.includes("user/whoishiring")) {
    return {
      ok: true,
      json: async () => ({
        submitted: [1, 2, 3, 4, 47219668]
      })
    };
  }
  return fetch(url, opts);
}

async function findWhoIsHiringThread_baseline(): Promise<number | null> {
  try {
    const res = await mockFetch(`${HN_API}/user/whoishiring.json?t=${Date.now()}`);
    if (!res.ok) return null;

    const user = await res.json();
    const submitted = user?.submitted || [];

    for (const id of submitted.slice(0, 5)) {
      const itemRes = await fetch(`${HN_API}/item/${id}.json?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!itemRes.ok) continue;
      const item = await itemRes.json();
      if (item?.title?.toLowerCase()?.includes("who is hiring")) {
        return id;
      }
    }
  } catch (err) {
    console.log("[hn] Failed to find hiring thread:", (err as Error).message);
  }
  return null;
}

async function findWhoIsHiringThread_optimized(): Promise<number | null> {
  try {
    const res = await mockFetch(`${HN_API}/user/whoishiring.json?t=${Date.now()}`);
    if (!res.ok) return null;

    const user = await res.json();
    const submitted = user?.submitted || [];

    const itemPromises = submitted.slice(0, 5).map(async (id: number) => {
      const itemRes = await fetch(`${HN_API}/item/${id}.json?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!itemRes.ok) return null;
      return itemRes.json();
    });

    const items = await Promise.all(itemPromises);

    // Process items in the original order to find the *first* (most recent) one
    for (const item of items) {
      if (item?.title?.toLowerCase()?.includes("who is hiring")) {
        return item.id;
      }
    }

  } catch (err) {
    console.log("[hn] Failed to find hiring thread:", (err as Error).message);
  }
  return null;
}


async function run() {
  let start = performance.now();
  let id = await findWhoIsHiringThread_baseline();
  let end = performance.now();
  console.log(`findWhoIsHiringThread_baseline took ${end - start} ms, found: ${id}`);

  start = performance.now();
  id = await findWhoIsHiringThread_optimized();
  end = performance.now();
  console.log(`findWhoIsHiringThread_optimized took ${end - start} ms, found: ${id}`);
}

run();
