import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatINR, formatINRCompact } from "../lib/format";
import type { IndianTaxReturn } from "../lib/schema";

interface Props {
  returns: Record<number, IndianTaxReturn>;
}

const COLORS = {
  income: "#4a90d9",
  tax: "#e05c5c",
  stcg: "#f4a261",
  ltcg: "#e9c46a",
  refund: "#52b788",
  due: "#e05c5c",
  rate: "#9b89c4",
};

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border-opaque)",
  borderRadius: "8px",
  color: "var(--color-text)",
  fontSize: "12px",
  padding: "8px 12px",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-(--color-border) bg-(--color-bg) p-5">
      <div className="mb-4 text-sm font-medium text-(--color-text-secondary)">{title}</div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex gap-5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-xs text-(--color-text-muted)">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function IndiaSummaryCharts({ returns }: Props) {
  const years = Object.keys(returns)
    .map(Number)
    .sort((a, b) => a - b);

  if (years.length < 2) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-(--color-text-muted)">
        Add at least 2 years to see trends
      </div>
    );
  }

  const fyLabel = (fy: number) => `FY ${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;

  // Income + Tax liability trend
  const incomeTaxData = years.map((fy) => {
    const r = returns[fy]!;
    return {
      year: fyLabel(fy),
      "Gross Income": r.income.grossTotal,
      "Tax Liability": r.tax.totalTaxLiability,
    };
  });

  // Capital gains trend (ITR-2 years only)
  const cgYears = years.filter((fy) => returns[fy]!.itrForm !== "ITR-1");
  const cgData = cgYears.map((fy) => {
    const r = returns[fy]!;
    return {
      year: fyLabel(fy),
      STCG: r.income.capitalGains.stcg.total,
      LTCG: r.income.capitalGains.ltcg.total,
    };
  });

  // Effective tax rate trend (tax liability / taxable income)
  const rateData = years.map((fy) => {
    const r = returns[fy]!;
    const rate =
      r.taxableIncome > 0
        ? parseFloat(((r.tax.totalTaxLiability / r.taxableIncome) * 100).toFixed(1))
        : 0;
    return { year: fyLabel(fy), "Effective Rate": rate };
  });

  // Refund / Due trend
  const refundData = years.map((fy) => {
    const r = returns[fy]!;
    return { year: fyLabel(fy), amount: r.tax.refundOrDue };
  });

  return (
    <div className="space-y-4 p-6">
      {/* Income & Tax Liability */}
      <ChartCard title="Gross Income & Tax Liability">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={incomeTaxData} barCategoryGap="30%" barGap={4}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="year"
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatINRCompact(Number(v))}
              tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => [formatINR(Number(value)), String(name)]}
              cursor={{ fill: "var(--color-bg-muted)" }}
            />
            <Bar dataKey="Gross Income" fill={COLORS.income} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Tax Liability" fill={COLORS.tax} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <Legend
          items={[
            { label: "Gross Income", color: COLORS.income },
            { label: "Tax Liability", color: COLORS.tax },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Capital Gains trend */}
        {cgData.length >= 2 && (
          <ChartCard title="Capital Gains Trend (ITR-2 years)">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cgData}>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatINRCompact(Number(v))}
                  tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <ReferenceLine y={0} stroke="var(--color-border-opaque)" strokeWidth={1} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [formatINR(Number(value)), String(name)]}
                  cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
                />
                <Line
                  dataKey="STCG"
                  stroke={COLORS.stcg}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.stcg }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="LTCG"
                  stroke={COLORS.ltcg}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS.ltcg }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Legend
              items={[
                { label: "STCG", color: COLORS.stcg },
                { label: "LTCG", color: COLORS.ltcg },
              ]}
            />
          </ChartCard>
        )}

        {/* Effective Tax Rate */}
        <ChartCard title="Effective Tax Rate">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rateData}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value}%`, "Effective Rate"]}
                cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
              />
              <Line
                dataKey="Effective Rate"
                stroke={COLORS.rate}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS.rate }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Refund / Due */}
        <ChartCard title="Refund / Tax Due">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={refundData} barCategoryGap="40%">
              <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatINRCompact(Number(v))}
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <ReferenceLine y={0} stroke="var(--color-border-opaque)" strokeWidth={1} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => {
                  const n = Number(value);
                  return [formatINR(n, true), n >= 0 ? "Refund" : "Tax Due"];
                }}
                cursor={{ fill: "var(--color-bg-muted)" }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {refundData.map((entry) => (
                  <Cell key={entry.year} fill={entry.amount >= 0 ? COLORS.refund : COLORS.due} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Legend
            items={[
              { label: "Refund", color: COLORS.refund },
              { label: "Tax Due", color: COLORS.due },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}
