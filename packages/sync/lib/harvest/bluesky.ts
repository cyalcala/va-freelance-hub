import { HarvestProvider, RawAgency } from './types';

export class BlueSkyProvider implements HarvestProvider {
  name = 'bluesky';

  async fetch(): Promise<RawAgency[]> {
    const results: RawAgency[] = [];
    const query = '#hiring VA Philippines';

    try {
      // Using public search endpoint (simplified for illustration)
      const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=50`);
      if (!response.ok) return [];

      const data = await response.json();
      const posts = data.posts;

      for (const post of posts) {
        // Extract links or mentions of agencies
        const text = post.record.text;
        const agencyName = this.extractAgencyName(text);

        if (agencyName) {
          results.push({
            name: agencyName,
            hiringUrl: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
            description: text.substring(0, 100),
            source: 'bluesky',
            rawMetadata: post,
          });
        }
      }
    } catch (e) {
      console.error('BlueSky fetch failed:', e);
    }

    return results;
  }

  private extractAgencyName(text: string): string | null {
    const match = text.match(/(?:at|join|with)\s*@?([A-Z][\w]{2,20})/i);
    return match ? match[1].trim() : null;
  }
}
