import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { BlueSkyProvider } from './bluesky';

describe('BlueSkyProvider', () => {
  let provider: BlueSkyProvider;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    provider = new BlueSkyProvider();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return an empty array if response is not ok', async () => {
    globalThis.fetch = mock(async () => new Response(null, { status: 500 }));

    const results = await provider.fetch();
    expect(results).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should return an empty array if fetch throws an error', async () => {
    // suppress console.error for clean test output
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    globalThis.fetch = mock(async () => { throw new Error('Network error'); });

    const results = await provider.fetch();
    expect(results).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();

    console.error = originalConsoleError;
  });

  it('should extract agency names and return mapped results', async () => {
    const mockPosts = {
      posts: [
        {
          uri: 'at://did:plc:123/app.bsky.feed.post/456',
          author: { handle: 'test.bsky.social' },
          record: {
            text: 'We are hiring! Join @AcmeCorp for a new VA role in the Philippines.',
          },
        },
        {
          uri: 'at://did:plc:789/app.bsky.feed.post/101',
          author: { handle: 'other.bsky.social' },
          record: {
            text: 'Work with TechStars today!',
          },
        }
      ]
    };

    globalThis.fetch = mock(async () => new Response(JSON.stringify(mockPosts), { status: 200 }));

    const results = await provider.fetch();

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      name: 'AcmeCorp',
      hiringUrl: 'https://bsky.app/profile/test.bsky.social/post/456',
      description: 'We are hiring! Join @AcmeCorp for a new VA role in the Philippines.',
      source: 'bluesky',
      rawMetadata: mockPosts.posts[0],
    });

    expect(results[1]).toEqual({
      name: 'TechStars',
      hiringUrl: 'https://bsky.app/profile/other.bsky.social/post/101',
      description: 'Work with TechStars today!',
      source: 'bluesky',
      rawMetadata: mockPosts.posts[1],
    });
  });

  it('should ignore posts without an agency name match', async () => {
    const mockPosts = {
      posts: [
        {
          uri: 'at://did:plc:123/app.bsky.feed.post/456',
          author: { handle: 'test.bsky.social' },
          record: {
            text: 'We are hiring for a new VA role in the Philippines.',
          },
        }
      ]
    };

    globalThis.fetch = mock(async () => new Response(JSON.stringify(mockPosts), { status: 200 }));

    const results = await provider.fetch();

    expect(results).toEqual([]);
  });
});
