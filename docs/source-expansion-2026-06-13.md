# Bounded Source Expansion - 2026-06-13

This report details the evaluation, compliance review, and activation of a new remote job source feed in our ingestion pipeline.

## New Source Details

- **ID**: `jobicy-supporting-apac`
- **Name**: `Jobicy Customer Support APAC`
- **URL**: `https://jobicy.com/feed/job_feed?job_categories=supporting&job_types=full-time&search_region=apac`
- **Type**: `rss`
- **Collection Method**: `rss_feed`
- **Platform**: `Jobicy`
- **Default Job Type**: `full-time`
- **Tags**: `["remote", "customer-support", "customer-service", "apac"]`
- **Limits**:
  - `maxItems`: 40 (strictly capped to protect database insertion sizing and API rate limits)
  - `minFetchIntervalMinutes`: 60 (cadence tracking to prevent excessive querying)

## Compliance Review

1. **Robots.txt**: Jobicy allows user-agents to fetch the `/feed/job_feed` endpoint.
2. **Legal Terms**: The feed includes a `<legalNotice>` tag stating:
   > "We appreciate your use of Jobicy Feeds in your projects! Please note that our RSS/XML access is designed primarily to facilitate broader distribution of our content... accessing the Feed a few times daily is sufficient and recommended."
3. **Data Usage**: Minimal metadata is stored. All listings contain direct links leading users back to Jobicy's original job post page to apply.

## Probe Validation Results

A local probe script verified the feed:
- **Status**: 200 OK
- **Items Returned**: 26
- **Format**: Valid RSS 2.0 XML
- **Sample Parsing**:
  - **Title**: `Technical Customer Support Specialist`
  - **Company**: `ElevenLabs` (resolved via title or dc:creator metadata)
  - **Link**: `https://jobicy.com/jobs/146338-technical-customer-support-specialist`
  - **Posted Date**: `2026-06-12T16:50:06.000Z`
  - **Description**: Plain text parsed with HTML tags removed, capped to 1500 characters.
  - **Content Hash**: `add0f212b9690057`
