/** Pure helpers for referral network UI labels (unit-testable). */

export function formatLevelBreakdown(
  breakdown?: Record<string, number> | null,
): string {
  if (!breakdown) return "No downline";
  const parts = Object.entries(breakdown)
    .map(([k, v]) => [Number(k), Number(v)] as const)
    .filter(([level, count]) => level > 0 && count > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([level, count]) => `L${level}:${count}`);
  return parts.length ? parts.join(" · ") : "No downline";
}

export function describeReferralExample(direct: number, network: number): string {
  const d = Math.max(0, Number(direct) || 0);
  const n = Math.max(0, Number(network) || 0);
  if (d === 0) return "No direct referrals yet.";
  const nested = Math.max(n - d, 0);
  if (nested === 0) {
    return `Referred ${d} person${d === 1 ? "" : "s"} directly.`;
  }
  return `Referred ${d} directly; network total ${n} (includes ${nested} deeper).`;
}
