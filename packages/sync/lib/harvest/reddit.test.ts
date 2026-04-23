import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { RedditProvider } from "./reddit";

describe("RedditProvider", () => {
  let provider: RedditProvider;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    provider = new RedditProvider();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should extract agencies from successful responses", async () => {
    const fetchMock = mock().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              children: [
                {
                  data: {
                    title: "Agency: Awesome VA",
                    selftext: "We are hiring!",
                    url: "/r/test/comments/123/",
                    name: "t3_123",
                  },
                },
                {
                  data: {
                    title: "Just a random post",
                    selftext: "No agency mentioned here.",
                    url: "/r/test/comments/456/",
                    name: "t3_456",
                  },
                },
                {
                  data: {
                    title: "Another post",
                    selftext: "Apply now at Company: Super Tech",
                    url: "/r/test/comments/789/",
                    name: "t3_789",
                  },
                },
              ],
            },
          }),
          { status: 200 }
        )
      )
    );
    global.fetch = fetchMock as any;

    const results = await provider.fetch();

    // 3 subreddits, 2 agencies per subreddit = 6 results
    expect(results).toHaveLength(6);

    // Check first result
    expect(results[0]).toEqual({
      name: "Awesome VA",
      hiringUrl: "https://reddit.com/r/test/comments/123/",
      description: "Agency: Awesome VA",
      source: "reddit",
      rawMetadata: expect.any(Object),
    });

    // Check second result
    expect(results[1]).toEqual({
      name: "Super Tech",
      hiringUrl: "https://reddit.com/r/test/comments/789/",
      description: "Another post",
      source: "reddit",
      rawMetadata: expect.any(Object),
    });
  });

  it("should handle non-200 responses gracefully", async () => {
    const fetchMock = mock().mockImplementation(() =>
      Promise.resolve(new Response("Not Found", { status: 404 }))
    );
    global.fetch = fetchMock as any;

    const results = await provider.fetch();
    expect(results).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("should handle fetch exceptions gracefully", async () => {
    // Suppress console.error for this test
    const originalConsoleError = console.error;
    console.error = mock();

    const fetchMock = mock().mockRejectedValue(new Error("Network Error"));
    global.fetch = fetchMock as any;

    const results = await provider.fetch();
    expect(results).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(console.error).toHaveBeenCalledTimes(3);

    // Restore console.error
    console.error = originalConsoleError;
  });
});
