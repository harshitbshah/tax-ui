import type { ForecastResponse } from "../lib/forecaster";

type RiskFlag = ForecastResponse["riskFlags"][number];

// High severity flags always appear before medium.
export function sortedByHighFirst(flags: RiskFlag[]): RiskFlag[] {
  return [...flags].sort((a, b) => {
    if (a.severity === "high" && b.severity !== "high") return -1;
    if (a.severity !== "high" && b.severity === "high") return 1;
    return 0;
  });
}

export function RiskFlags({ riskFlags }: { riskFlags: RiskFlag[] }) {
  const sorted = sortedByHighFirst(riskFlags);

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg) p-5">
      <div className="mb-4 text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
        What could shift this forecast
      </div>
      <div className="flex flex-col divide-y divide-(--color-border)">
        {sorted.map((flag, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <div
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                flag.severity === "high" ? "bg-rose-500" : "bg-amber-500"
              }`}
            />
            <p className="text-sm text-(--color-text-muted)">{flag.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
