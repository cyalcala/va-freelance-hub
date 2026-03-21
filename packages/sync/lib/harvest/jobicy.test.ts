import { expect, test, describe, mock, afterEach } from 'bun:test';
import { JobicyProvider } from './jobicy';

describe('JobicyProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('should fetch and map jobs correctly', async () => {
    const mockJobs = [
      {
        companyName: 'Test Company',
        url: 'https://test.com',
        companyLogo: 'https://test.com/logo.png',
        jobTitle: 'Software Engineer',
      }
    ];

    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({ jobs: mockJobs }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const provider = new JobicyProvider();
    const results = await provider.fetch();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: 'Test Company',
      hiringUrl: 'https://test.com',
      logoUrl: 'https://test.com/logo.png',
      description: 'Software Engineer',
      source: 'jobicy',
      rawMetadata: mockJobs[0],
    });
  });

  test('should return empty array on non-200 response', async () => {
    globalThis.fetch = mock(async () => {
      return new Response('Not Found', {
        status: 404,
      });
    });

    const provider = new JobicyProvider();
    const results = await provider.fetch();

    expect(results).toEqual([]);
  });

  test('should return empty array on fetch error', async () => {
    // Suppress console.error for this test to avoid polluting test output
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    globalThis.fetch = mock(async () => {
      throw new Error('Network error');
    });

    const provider = new JobicyProvider();
    const results = await provider.fetch();

    expect(results).toEqual([]);

    console.error = originalConsoleError;
  });

  test('should return empty array if jobs is missing in response', async () => {
    // We should safely handle missing jobs array without throwing
    const originalConsoleError = console.error;
    console.error = mock(() => {});

    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const provider = new JobicyProvider();
    const results = await provider.fetch();

    expect(results).toEqual([]);

    console.error = originalConsoleError;
  });
});
