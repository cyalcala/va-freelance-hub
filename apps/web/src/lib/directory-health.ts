import type { LinkVerdict } from "@va-hub/scraper";

const STRIKE_THRESHOLD = 3;
const SYSTEMIC_UNREACHABLE_MIN_CHECKED = 10;
const SYSTEMIC_UNREACHABLE_RATIO = 0.8;

type DirectoryHealthValues = {
  linkStatus: LinkVerdict["status"];
  linkEvidence: string;
  linkCheckedAt: string;
  linkFailCount: number;
  isVerified?: false;
};

export function buildDirectoryHealthUpdate(input: {
  verdict: LinkVerdict;
  priorFailCount: number | null;
  isVerified: boolean;
  checkedAt: string;
}): { values: DirectoryHealthValues; reachedThreshold: boolean } {
  const { verdict, checkedAt } = input;
  const base = {
    linkStatus: verdict.status,
    linkEvidence: verdict.evidence,
    linkCheckedAt: checkedAt,
  };

  if (verdict.status === "unreachable") {
    return {
      values: { ...base, linkFailCount: input.priorFailCount ?? 0 },
      reachedThreshold: false,
    };
  }

  if (!verdict.isHardDead) {
    return { values: { ...base, linkFailCount: 0 }, reachedThreshold: false };
  }

  const strikes = (input.priorFailCount ?? 0) + 1;
  const reachedThreshold = strikes >= STRIKE_THRESHOLD && input.isVerified;
  return {
    values: {
      ...base,
      linkFailCount: strikes,
      ...(reachedThreshold ? { isVerified: false as const } : {}),
    },
    reachedThreshold,
  };
}

export function directoryHealthStatus(checked: number, tally: Record<string, number>) {
  const unreachable = tally.unreachable ?? 0;
  const unreachableRatio = checked === 0 ? 0 : unreachable / checked;
  return {
    unreachable,
    unreachableRatio,
    degraded: checked >= SYSTEMIC_UNREACHABLE_MIN_CHECKED
      && unreachableRatio >= SYSTEMIC_UNREACHABLE_RATIO,
  };
}
