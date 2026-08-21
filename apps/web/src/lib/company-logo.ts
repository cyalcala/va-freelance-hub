const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export type CompanyLogoRequest = {
  domain: string;
  initial: string;
};

export function parseCompanyLogoRequest(url: URL): CompanyLogoRequest | null {
  const domain = (url.searchParams.get("domain") || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  const topLevelLabel = domain.split(".").at(-1) || "";
  if (!HOSTNAME_PATTERN.test(domain) || !/[a-z]/i.test(topLevelLabel)) return null;

  const requestedInitial = (url.searchParams.get("initial") || "").trim().toUpperCase();
  const initial = /^[A-Z0-9]$/.test(requestedInitial)
    ? requestedInitial
    : domain.charAt(0).toUpperCase();

  return { domain, initial };
}

export function companyLogoFallbackSvg(initial: string): string {
  const safeInitial = /^[A-Z0-9]$/.test(initial) ? initial : "?";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#f3eee8"/><text x="32" y="39" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#766e68">${safeInitial}</text></svg>`;
}
