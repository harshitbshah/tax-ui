import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatINR, formatINRCompact } from "../lib/format";
import type { IndianTaxReturn } from "../lib/schema";

interface Props {
  data: IndianTaxReturn;
}

const COLORS = {
  salary: "#4a90d9",
  houseProperty: "#9b89c4",
  stcg: "#f4a261",
  ltcg: "#e9c46a",
  otherSources: "#52b788",
  muted: "#aaa",
  tax: "#e05c5c",
  paid: "#52b788",
  refund: "#52b788",
  due: "#e05c5c",
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

export function IndiaYearCharts({ data }: Props) {
  const { income, tax } = data;

  // Income breakdown donut
  const incomeSlices: { name: string; value: number; color: string }[] = [];
  const salaryTotal = income.salary.reduce((s, i) => s + i.amount, 0);
  const hpTotal = income.houseProperty.reduce((s, i) => s + i.amount, 0);
  const otherTotal = income.otherSources.reduce((s, i) => s + i.amount, 0);

  if (salaryTotal > 0)
    incomeSlices.push({ name: "Salary", value: salaryTotal, color: COLORS.salary });
  if (hpTotal > 0)
    incomeSlices.push({ name: "House Property", value: hpTotal, color: COLORS.houseProperty });
  if (income.capitalGains.stcg.total > 0)
    incomeSlices.push({ name: "STCG", value: income.capitalGains.stcg.total, color: COLORS.stcg });
  if (income.capitalGains.ltcg.total > 0)
    incomeSlices.push({ name: "LTCG", value: income.capitalGains.ltcg.total, color: COLORS.ltcg });
  if (otherTotal > 0)
    incomeSlices.push({ name: "Other Sources", value: otherTotal, color: COLORS.otherSources });

  // Tax flow bar chart: liability vs paid vs refund/due
  const flowData = [
    { label: "Tax Liability", value: tax.totalTaxLiability, color: COLORS.tax },
    { label: "Tax Paid", value: tax.totalTaxPaid, color: COLORS.paid },
    {
      label: tax.refundOrDue >= 0 ? "Refund" : "Tax Due",
      value: Math.abs(tax.refundOrDue),
      color: tax.refundOrDue >= 0 ? COLORS.refund : COLORS.due,
    },
  ];

  const hasIncomeBreakdown = incomeSlices.length > 0;

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Income breakdown donut */}
        {hasIncomeBreakdown && (
          <ChartCard title="Income Sources">
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={incomeSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {incomeSlices.map((slice, i) => (
                      <Cell key={i} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [formatINR(Number(value)), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {incomeSlices.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: slice.color }}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs text-(--color-text)">{slice.name}</div>
                      <div className="text-xs text-(--color-text-muted)">
                        {formatINR(slice.value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {/* Tax flow */}
        <ChartCard title="Tax Summary">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} barCategoryGap="40%">
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
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
                  formatter={(value, _, props) => [formatINR(Number(value)), props.payload.label]}
                  cursor={{ fill: "var(--color-bg-muted)" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {flowData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {tax.grossTax > 0 && (
            <div className="mt-3 space-y-1 border-t border-(--color-border) pt-3 text-xs text-(--color-text-muted)">
              <div className="flex justify-between">
                <span>Gross Tax</span>
                <span className="tabular-nums">{formatINR(tax.grossTax)}</span>
              </div>
              {tax.surcharge > 0 && (
                <div className="flex justify-between">
                  <span>Surcharge</span>
                  <span className="tabular-nums">{formatINR(tax.surcharge)}</span>
                </div>
              )}
              {tax.educationCess > 0 && (
                <div className="flex justify-between">
                  <span>Education Cess</span>
                  <span className="tabular-nums">{formatINR(tax.educationCess)}</span>
                </div>
              )}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
