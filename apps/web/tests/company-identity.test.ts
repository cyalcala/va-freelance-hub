import { expect, test } from 'bun:test';
import { companyLogoDomains, employerLogoDomain, withCompanyLogo } from '../src/lib/company-identity';
import type { PublicDirectoryRow } from '../src/lib/public-board';

function company(companyName: string, website: string | null): PublicDirectoryRow {
  return { id: 1, companyName, website, niche: 'global-va', isDayshift: false,
    isVerified: false, isRemote: true, isMarketplace: false };
}

test('company marks use an exact recorded identity with case and whitespace normalization', () => {
  const domains = companyLogoDomains([company('Acme Virtual', 'https://www.acme.example/careers')]);
  expect(withCompanyLogo({ company: '  ACME   Virtual ', id: 42 }, domains)).toEqual({
    company: '  ACME   Virtual ', id: 42, logoDomain: 'acme.example',
  });
  expect(withCompanyLogo({ company: 'Acme', sourcePlatform: 'RemoteOK' }, domains).logoDomain).toBeNull();
  expect(withCompanyLogo({ company: null }, domains).logoDomain).toBeNull();
});

test('ambiguous domains stay unknown regardless of subsequent duplicate rows or order', () => {
  const rows = [company('Acme', 'acme.example'), company('ACME', 'different.example'), company('Acme', 'acme.example')];
  for (const list of [rows, rows.toReversed()]) {
    expect(withCompanyLogo({ company: 'Acme' }, companyLogoDomains(list)).logoDomain).toBeNull();
  }
});

test('missing and rejected directory websites never generate company domains', () => {
  for (const website of [null, '', 'http://localhost/', 'http://127.0.0.1/', 'http://user:pass@acme.example/', 'javascript:alert(1)']) {
    expect(withCompanyLogo({ company: 'Acme' }, companyLogoDomains([company('Acme', website)])).logoDomain).toBeNull();
  }
});

test('presentation enrichment preserves original records and ordering', () => {
  const jobs = [{ id: 2, company: 'ＡＣＭＥ' }, { id: 1, company: 'Other' }];
  const enriched = jobs.map((job) => withCompanyLogo(job, companyLogoDomains([company('Acme', 'acme.example')])));
  expect(enriched.map((job) => job.id)).toEqual([2, 1]);
  expect(enriched[0].logoDomain).toBe('acme.example');
  expect(enriched[1].logoDomain).toBeNull();
  expect(jobs[0]).toEqual({ id: 2, company: 'ＡＣＭＥ' });
});

test('hosted careers provider marks are never presented as employer logos', () => {
  for (const domain of ['apply.workable.com', 'boards.greenhouse.io', 'jobs.lever.co', 'acme.myworkdayjobs.com', 'facebook.com', 'www.linkedin.com', 'linktr.ee', 'apply.workable.com.', 'WWW.LINKEDIN.COM.']) {
    expect(employerLogoDomain(domain)).toBeNull();
    expect(withCompanyLogo({ company: 'Acme' }, companyLogoDomains([company('Acme', `https://${domain}/acme`)])).logoDomain).toBeNull();
  }
  expect(employerLogoDomain('workable.example')).toBe('workable.example');
  expect(employerLogoDomain('ACME.EXAMPLE.')).toBe('acme.example');
});
