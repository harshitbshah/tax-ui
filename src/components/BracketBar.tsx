import { formatCurrency } from "../lib/format";

interface BracketBarProps {
  rate: number;
  floor: number;
  ceiling: number;
  projectedIncome: number;
  headroom: number;
}

// Returns how far through the bracket the projected income sits, clamped 0–100.
export function computeFillPercent(
  floor: number,
  ceiling: number,
  projectedIncome: number,
): number {
  if (ceiling <= floor) return 0;
  const pct = ((projectedIncome - floor) / (ceiling - floor)) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function BracketBar({ rate, floor, ceiling, projectedIncome, headroom }: BracketBarProps) {
  const fillPct = computeFillPercent(floor, ceiling, projectedIncome);
  const nextRate = rate + 2; // rough next bracket (22→24, 24→32, etc.)

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-bg) p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-widest text-(--color-text-muted) uppercase">
          {rate}% Bracket Position
        </span>
        {headroom > 0 && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            {formatCurrency(headroom)} headroom
          </span>
        )}
      </div>

      <div className="mb-2 flex justify-between text-[11px] text-(--color-text-muted)">
        <span>Bracket floor {formatCurrency(floor)}</span>
        <span>Ceiling {formatCurrency(ceiling)}</span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-(--color-bg-muted)">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${fillPct}%` }}
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {headroom > 0 && (
        <p className="mt-2.5 text-xs text-amber-600 dark:text-amber-400">
          ⚡ {formatCurrency(headroom)} before hitting {nextRate}% — consider 401k top-up or
          additional deductions before year-end.
        </p>
      )}
    </div>
  );
}
