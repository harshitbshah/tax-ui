import { formatINR } from "../lib/format";
import type { IndianTaxReturn } from "../lib/schema";

interface Props {
  data: IndianTaxReturn;
}

function CategoryHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={2} className="pt-6 pb-2">
        <span className="text-xs text-(--color-text-muted)">{children}</span>
      </td>
    </tr>
  );
}

function DataRow({
  label,
  amount,
  isMuted,
  currency = "INR",
}: {
  label: string;
  amount: number;
  isMuted?: boolean;
  currency?: string;
}) {
  return (
    <tr className={isMuted ? "text-(--color-text-muted)" : ""}>
      <td className="py-1.5 text-sm">{label}</td>
      <td className="py-1.5 text-right text-sm slashed-zero tabular-nums">
        {amount < 0 ? "-" : ""}
        {currency === "INR" ? formatINR(Math.abs(amount)) : Math.abs(amount).toLocaleString()}
      </td>
    </tr>
  );
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <>
      <tr>
        <td colSpan={2} className="h-2" />
      </tr>
      <tr className="border-t border-(--color-border) font-semibold">
        <td className="py-2 pt-4 text-sm">{label}</td>
        <td className="py-2 pt-4 text-right text-sm slashed-zero tabular-nums">
          {amount < 0 ? "-" : ""}
          {formatINR(Math.abs(amount))}
        </td>
      </tr>
    </>
  );
}

export function IndiaReceiptView({ data }: Props) {
  const { income, deductions, tax } = data;
  const hasSalary = income.salary.length > 0;
  const hasHP = income.houseProperty.length > 0;
  const hasCG = income.capitalGains.stcg.total !== 0 || income.capitalGains.ltcg.total !== 0;
  const hasOther = income.otherSources.length > 0;
  const hasDeductions = deductions.length > 0;
  const hasTDS = tax.tds.length > 0;
  const hasAdvance = tax.advanceTax.length > 0;
  const hasSAT = tax.selfAssessmentTax.length > 0;

  const fyLabel = `FY ${data.financialYear}-${String(data.financialYear + 1).slice(-2)}`;
  const ayStartYear = parseInt(data.assessmentYear.split("-")[0]!);
  const cessLabel = ayStartYear >= 2019 ? "Health & Education Cess (4%)" : "Education Cess (3%)";

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-base font-semibold">{data.name}</h2>
            <p className="text-sm text-(--color-text-muted)">
              {fyLabel} · AY {data.assessmentYear} · {data.itrForm ?? "ITR-2"} ·{" "}
              {data.residencyStatus === "non_resident"
                ? "Non-Resident"
                : data.residencyStatus === "rnor"
                  ? "RNOR"
                  : "Resident"}
            </p>
          </div>
          <div
            className={`text-lg font-semibold ${tax.refundOrDue >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {tax.refundOrDue >= 0 ? "Refund" : "Due"} {formatINR(Math.abs(tax.refundOrDue))}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {/* Income */}
          {hasSalary && (
            <>
              <CategoryHeader>Salary Income</CategoryHeader>
              {income.salary.map((item) => (
                <DataRow key={item.label} label={item.label} amount={item.amount} />
              ))}
            </>
          )}

          {hasHP && (
            <>
              <CategoryHeader>House Property</CategoryHeader>
              {income.houseProperty.map((item) => (
                <DataRow key={item.label} label={item.label} amount={item.amount} />
              ))}
            </>
          )}

          {hasCG && (
            <>
              <CategoryHeader>Capital Gains</CategoryHeader>
              {income.capitalGains.stcg.items.map((item) => (
                <DataRow key={item.label} label={item.label} amount={item.amount} />
              ))}
              {income.capitalGains.stcg.items.length > 1 && (
                <DataRow label="Total STCG" amount={income.capitalGains.stcg.total} isMuted />
              )}
              {income.capitalGains.ltcg.items.map((item) => (
                <DataRow key={item.label} label={item.label} amount={item.amount} />
              ))}
              {income.capitalGains.ltcg.items.length > 1 && (
                <DataRow label="Total LTCG" amount={income.capitalGains.ltcg.total} isMuted />
              )}
            </>
          )}

          {hasOther && (
            <>
              <CategoryHeader>Other Sources</CategoryHeader>
              {income.otherSources.map((item) => (
                <DataRow key={item.label} label={item.label} amount={item.amount} />
              ))}
            </>
          )}

          <TotalRow label="Gross Total Income" amount={income.grossTotal} />

          {hasDeductions && (
            <>
              <CategoryHeader>Deductions (Chapter VI-A)</CategoryHeader>
              {deductions.map((item) => (
                <DataRow key={item.label} label={`− ${item.label}`} amount={-item.amount} />
              ))}
            </>
          )}

          <TotalRow label="Taxable Income" amount={data.taxableIncome} />

          {/* Tax Computation */}
          <CategoryHeader>Tax Computation</CategoryHeader>
          <DataRow label="Gross Tax" amount={tax.grossTax} />
          {tax.surcharge > 0 && <DataRow label="Surcharge" amount={tax.surcharge} />}
          {tax.educationCess > 0 && <DataRow label={cessLabel} amount={tax.educationCess} />}
          <TotalRow label="Total Tax Liability" amount={tax.totalTaxLiability} />

          {/* Taxes Paid */}
          {(hasTDS || hasAdvance || hasSAT) && (
            <>
              <CategoryHeader>Taxes Paid</CategoryHeader>
              {hasTDS &&
                tax.tds.map((item) => (
                  <DataRow key={item.label} label={item.label} amount={item.amount} />
                ))}
              {hasAdvance &&
                tax.advanceTax.map((item) => (
                  <DataRow key={item.label} label={item.label} amount={item.amount} />
                ))}
              {hasSAT &&
                tax.selfAssessmentTax.map((item) => (
                  <DataRow key={item.label} label={item.label} amount={item.amount} />
                ))}
            </>
          )}

          <TotalRow label="Total Tax Paid" amount={tax.totalTaxPaid} />

          {/* Refund / Due */}
          <>
            <tr>
              <td colSpan={2} className="h-2" />
            </tr>
            <tr className="border-t-2 border-(--color-border) font-bold">
              <td className="py-3 text-sm">{tax.refundOrDue >= 0 ? "Refund" : "Tax Due"}</td>
              <td
                className={`py-3 text-right text-sm slashed-zero tabular-nums ${
                  tax.refundOrDue >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {tax.refundOrDue >= 0 ? "+" : "-"}
                {formatINR(Math.abs(tax.refundOrDue))}
              </td>
            </tr>
          </>
        </tbody>
      </table>

      {data.pan && <p className="mt-8 text-xs text-(--color-text-muted)">PAN: {data.pan}</p>}
    </div>
  );
}
