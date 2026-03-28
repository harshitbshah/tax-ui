import type { ForecastResponse } from "../lib/forecaster";

type Assumption = ForecastResponse["assumptions"][number];

export function confidenceBadgeClass(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return "text-emerald-600 dark:text-emerald-400";
  if (confidence === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

export function AssumptionsCard({ assumptions }: { assumptions: Assumption[] }) {
  return (
    <div className="flex flex-col rounded-lg border border-(--color-border) bg-(--color-bg)">
      <div className="border-b border-(--color-border) px-5 py-3">
        <span className="text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
          AI Assumptions
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {assumptions.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md border border-(--color-border) bg-(--color-bg-muted) p-3"
          >
            <span className="mt-0.5 shrink-0 text-sm">{a.icon}</span>
            <div className="min-w-0">
              <p className="text-sm text-(--color-text)">
                <span className="font-medium">{a.label}</span>
                {a.value && (
                  <span className="ml-1.5 font-semibold text-(--color-text)">{a.value}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-(--color-text-muted)">{a.reasoning}</p>
              <p className={`mt-1 text-[11px] font-medium ${confidenceBadgeClass(a.confidence)}`}>
                {confidenceLabel(a.confidence)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
