import type { ForecastResponse } from "../lib/forecaster";

type ActionItem = ForecastResponse["actionItems"][number];

const CATEGORY_ICONS: Record<ActionItem["category"], string> = {
  // US
  retirement: "🏦",
  withholding: "💼",
  // India
  investments: "📊",
  regime_choice: "⚖️",
  advance_tax: "📅",
  // Common
  capital_gains: "📉",
  deductions: "🏠",
};

export function ActionItemsCard({ actionItems }: { actionItems: ActionItem[] }) {
  return (
    <div className="flex flex-col rounded-lg border border-(--color-border) bg-(--color-bg)">
      <div className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
        <span className="text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
          What to Do
        </span>
        <span className="rounded bg-(--color-bg-muted) px-2 py-0.5 text-[11px] text-(--color-text-muted)">
          {actionItems.length} {actionItems.length === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {actionItems.map((item, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-md border border-(--color-border) bg-(--color-bg-muted) p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-bg) text-sm">
              {CATEGORY_ICONS[item.category]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-(--color-text)">{item.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-(--color-text-muted)">
                {item.description}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {item.estimatedSaving}
              </p>
              {(item.sourceYear ?? item.timing) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.sourceYear && (
                    <span className="rounded bg-(--color-bg) px-1.5 py-0.5 text-[10px] text-(--color-text-muted)">
                      From {item.sourceYear}
                    </span>
                  )}
                  {item.timing && (
                    <span className="rounded bg-(--color-bg) px-1.5 py-0.5 text-[10px] text-(--color-text-muted)">
                      {item.timing}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
