// Shared types and pure utilities — safe to import from both server and browser.

export type ForecastProfile = {
  salary1?: number;
  salary2?: number;
  bonusLow1?: number;
  bonusHigh1?: number;
  bonusLow2?: number;
  bonusHigh2?: number;
  rsu?: number;
  k401_1?: number;
  k401_2?: number;
  backdoorRoth?: "both" | "one" | "none";
  ytdWithholding?: number;
  ytdMonth?: number; // 1–12
  capitalGains?: number;
};

export const TOTAL_PROFILE_FIELDS = 7;

export function countFilledFields(profile: ForecastProfile | null): number {
  if (!profile) return 0;
  const checks = [
    profile.salary1 != null || profile.salary2 != null,
    profile.bonusLow1 != null ||
      profile.bonusHigh1 != null ||
      profile.bonusLow2 != null ||
      profile.bonusHigh2 != null,
    profile.rsu != null,
    profile.k401_1 != null || profile.k401_2 != null,
    profile.backdoorRoth != null,
    profile.ytdWithholding != null,
    profile.capitalGains != null,
  ];
  return checks.filter(Boolean).length;
}

export function confidenceLevel(
  profile: ForecastProfile | null,
): "low" | "medium" | "good" | "high" {
  const n = countFilledFields(profile);
  if (n <= 1) return "low";
  if (n <= 3) return "medium";
  if (n <= 5) return "good";
  return "high";
}
