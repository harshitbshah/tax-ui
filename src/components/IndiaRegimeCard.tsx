import type { ForecastResponse } from "../lib/forecaster";
import { formatINRCompact } from "../lib/format";

type IndiaForecast = NonNullable<ForecastResponse["india"]>;

export function IndiaRegimeCard({ india }: { india: IndiaForecast }) {
  const { regimeRecommendation, oldRegimeTax, newRegimeTax, savingUnderRecommended, reasoning } =
    india;

  const regimes: Array<{ key: "old" | "new"; label: string; tax: number }> = [
    { key: "old", label: "Old Regime", tax: oldRegimeTax },
    { key: "new", label: "New Regime", tax: newRegimeTax },
  ];

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg) p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
          🇮🇳 India Regime Recommendation
        </span>
        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          Save {formatINRCompact(savingUnderRecommended)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {regimes.map(({ key, label, tax }) => {
          const isRecommended = key === regimeRecommendation;
          return (
            <div
              key={key}
              className={`rounded-lg border-2 p-4 ${
                isRecommended
                  ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                  : "border-(--color-border) bg-(--color-bg-muted)"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                {label}
                {isRecommended && (
                  <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-xl font-semibold text-(--color-text) tabular-nums">
                {formatINRCompact(tax)}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-(--color-text-muted)">{reasoning}</p>
    </div>
  );
}
