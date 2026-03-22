import { formatINR, formatINRCompact } from "../lib/format";
import type { IndianTaxReturn } from "../lib/schema";

interface Props {
  returns: Record<number, IndianTaxReturn>;
}

function yoyPct(current: number, previous: number | undefined): string | null {
  if (previous === undefined || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function YoY({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number | undefined;
  invert?: boolean;
}) {
  const label = yoyPct(current, previous);
  if (!label) return null;
  const isIncrease = current > (previous ?? 0);
  const isGood = invert ? !isIncrease : isIncrease;
  return (
    <span
      className={`ml-1.5 text-xs tabular-nums ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
    >
      {label}
    </span>
  );
}

export function IndiaSummaryView({ returns }: Props) {
  const years = Object.keys(returns)
    .map(Number)
    .sort((a, b) => a - b);

  if (years.length === 0) return null;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-(--color-bg)">
          <tr className="border-b border-(--color-border) text-xs text-(--color-text-muted)">
            <th className="px-6 pt-6 pb-3 text-left font-medium">Year</th>
            <th className="px-4 pt-6 pb-3 text-right font-medium">Gross Income</th>
            <th className="px-4 pt-6 pb-3 text-right font-medium">STCG</th>
            <th className="px-4 pt-6 pb-3 text-right font-medium">LTCG</th>
            <th className="px-4 pt-6 pb-3 text-right font-medium">Tax Liability</th>
            <th className="px-4 pt-6 pb-3 text-right font-medium">Tax Paid</th>
            <th className="px-6 pt-6 pb-3 text-right font-medium">Refund / Due</th>
          </tr>
        </thead>
        <tbody>
          {years.map((fy, idx) => {
            const r = returns[fy]!;
            const prev = idx > 0 ? returns[years[idx - 1]!] : undefined;
            const refund = r.tax.refundOrDue;
            const isItr1 = r.itrForm === "ITR-1";
            return (
              <tr key={fy} className="border-b border-(--color-border) hover:bg-(--color-bg-muted)">
                <td className="px-6 py-4">
                  <div className="font-medium">
                    FY {fy}-{String(fy + 1).slice(-2)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-(--color-text-muted)">
                    AY {r.assessmentYear}
                    {r.itrForm && (
                      <span className="rounded bg-(--color-bg-muted) px-1.5 py-0.5">
                        {r.itrForm}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right slashed-zero tabular-nums">
                  <span title={formatINR(r.income.grossTotal)}>
                    {formatINRCompact(r.income.grossTotal)}
                  </span>
                  <YoY current={r.income.grossTotal} previous={prev?.income.grossTotal} />
                </td>
                <td
                  className={`px-4 py-4 text-right slashed-zero tabular-nums ${
                    !isItr1 && r.income.capitalGains.stcg.total < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {isItr1 ? (
                    <span className="text-(--color-text-muted)">—</span>
                  ) : (
                    <>
                      <span title={formatINR(r.income.capitalGains.stcg.total)}>
                        {formatINRCompact(r.income.capitalGains.stcg.total)}
                      </span>
                      <YoY
                        current={r.income.capitalGains.stcg.total}
                        previous={
                          prev?.itrForm !== "ITR-1"
                            ? prev?.income.capitalGains.stcg.total
                            : undefined
                        }
                      />
                    </>
                  )}
                </td>
                <td
                  className={`px-4 py-4 text-right slashed-zero tabular-nums ${
                    !isItr1 && r.income.capitalGains.ltcg.total < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {isItr1 ? (
                    <span className="text-(--color-text-muted)">—</span>
                  ) : (
                    <>
                      <span title={formatINR(r.income.capitalGains.ltcg.total)}>
                        {formatINRCompact(r.income.capitalGains.ltcg.total)}
                      </span>
                      <YoY
                        current={r.income.capitalGains.ltcg.total}
                        previous={
                          prev?.itrForm !== "ITR-1"
                            ? prev?.income.capitalGains.ltcg.total
                            : undefined
                        }
                      />
                    </>
                  )}
                </td>
                <td className="px-4 py-4 text-right slashed-zero tabular-nums">
                  <span title={formatINR(r.tax.totalTaxLiability)}>
                    {formatINRCompact(r.tax.totalTaxLiability)}
                  </span>
                  <YoY
                    current={r.tax.totalTaxLiability}
                    previous={prev?.tax.totalTaxLiability}
                    invert
                  />
                </td>
                <td className="px-4 py-4 text-right slashed-zero tabular-nums">
                  <span title={formatINR(r.tax.totalTaxPaid)}>
                    {formatINRCompact(r.tax.totalTaxPaid)}
                  </span>
                </td>
                <td
                  className={`px-6 py-4 text-right font-medium slashed-zero tabular-nums ${
                    refund >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  <span title={formatINR(Math.abs(refund))}>{formatINRCompact(refund, true)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
