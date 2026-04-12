import { useMemo } from "react";

import { formatINRCompact } from "../lib/format";
import type { IndianTaxReturn } from "../lib/schema";
import { AnimatedNumber } from "./AnimatedNumber";
import { Sparkline } from "./Sparkline";

interface Props {
  returns: Record<number, IndianTaxReturn>;
  selectedYear: "summary" | number;
}

export function IndiaStatsHeader({ returns, selectedYear }: Props) {
  const isSummary = selectedYear === "summary";

  const years = useMemo(
    () =>
      Object.keys(returns)
        .map(Number)
        .sort((a, b) => a - b),
    [returns],
  );

  const activeIndex = useMemo(() => {
    if (isSummary) return null;
    const idx = years.indexOf(selectedYear as number);
    return idx >= 0 ? idx : null;
  }, [isSummary, years, selectedYear]);

  const sparklines = useMemo(() => {
    if (years.length < 2) return null;
    const all = years.map((y) => returns[y]).filter((r): r is IndianTaxReturn => r !== undefined);
    if (all.length < 2) return null;
    return {
      income: all.map((r) => r.income.grossTotal),
      taxes: all.map((r) => r.tax.totalTaxLiability),
    };
  }, [returns, years]);

  const stats = useMemo(() => {
    if (isSummary) {
      if (years.length === 0) return null;
      const all = years.map((y) => returns[y]).filter((r): r is IndianTaxReturn => r !== undefined);
      if (all.length === 0) return null;
      return {
        income: all.reduce((sum, r) => sum + r.income.grossTotal, 0),
        taxes: all.reduce((sum, r) => sum + r.tax.totalTaxLiability, 0),
        refund: all.reduce((sum, r) => sum + r.tax.refundOrDue, 0),
      };
    } else {
      const r = returns[selectedYear];
      if (!r) return null;
      return {
        income: r.income.grossTotal,
        taxes: r.tax.totalTaxLiability,
        refund: r.tax.refundOrDue,
      };
    }
  }, [returns, years, selectedYear, isSummary]);

  if (!stats) return null;

  const fyLabel = isSummary
    ? "All years"
    : `FY ${selectedYear}-${String((selectedYear as number) + 1).slice(-2)}`;

  return (
    <div className="shrink-0 border-b border-(--color-border) px-6 py-6">
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="col-span-2 flex items-center lg:col-span-1">
          <div className="text-2xl font-semibold tracking-tight text-(--color-text-secondary) slashed-zero tabular-nums">
            {fyLabel}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-(--color-text-muted)">Gross Income</div>
          <div className="flex items-center gap-3">
            <AnimatedNumber
              value={stats.income}
              format={formatINRCompact}
              className="text-2xl font-semibold tracking-tight slashed-zero tabular-nums"
            />
            {sparklines && (
              <Sparkline
                values={sparklines.income}
                width={48}
                height={20}
                className="text-(--color-chart)"
                activeIndex={activeIndex}
              />
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-(--color-text-muted)">Tax Liability</div>
          <div className="flex items-center gap-3">
            <AnimatedNumber
              value={stats.taxes}
              format={formatINRCompact}
              className="text-2xl font-semibold tracking-tight slashed-zero tabular-nums"
            />
            {sparklines && (
              <Sparkline
                values={sparklines.taxes}
                width={48}
                height={20}
                className="text-(--color-chart)"
                activeIndex={activeIndex}
              />
            )}
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs text-(--color-text-muted)">
            {stats.refund >= 0 ? "Refund" : "Tax Due"}
          </div>
          <div className="flex items-center gap-3">
            <AnimatedNumber
              value={Math.abs(stats.refund)}
              format={formatINRCompact}
              className={`text-2xl font-semibold tracking-tight slashed-zero tabular-nums ${
                stats.refund >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
