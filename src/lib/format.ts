const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatINR(amount: number, showSign = false): string {
  const formatted = inrFormatter.format(Math.abs(amount));
  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return amount < 0 ? `-${formatted}` : formatted;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, showSign = false): string {
  const formatted = currencyFormatter.format(Math.abs(amount));
  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return amount < 0 ? `-${formatted}` : formatted;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatPercentChange(current: number, previous: number): string {
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

// Compact INR format for summary tables: ₹19.68L, ₹1.23Cr, ₹45,000
export function formatINRCompact(amount: number, showSign = false): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : showSign && amount !== 0 ? "+" : "";

  if (abs >= 1_00_00_000) {
    const val = abs / 1_00_00_000;
    return `${sign}₹${val.toFixed(val >= 10 ? 1 : 2)}Cr`;
  }
  if (abs >= 1_00_000) {
    const val = abs / 1_00_000;
    return `${sign}₹${val.toFixed(2)}L`;
  }
  return `${sign}${inrFormatter.format(abs)}`;
}

export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000) {
    const value = abs / 1_000_000;
    return `${sign}$${value.toFixed(value >= 10 ? 1 : 2)}M`;
  }
  if (abs >= 1_000) {
    const value = abs / 1_000;
    return `${sign}$${value.toFixed(value >= 100 ? 0 : 0)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatCurrencyCents(amount: number, suffix?: string): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  let value: string;
  if (abs >= 0.01) {
    value = abs.toFixed(2);
  } else {
    // For sub-cent values, use 3 decimals but strip trailing zeros
    value = parseFloat(abs.toFixed(3)).toString();
  }

  const formatted = `${sign}$${value}`;
  return suffix ? `${formatted}/${suffix}` : formatted;
}
