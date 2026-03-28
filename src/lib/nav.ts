import type { IndianTaxReturn, TaxReturn } from "./schema";
import type { NavItem } from "./types";

export type SelectedView = "summary" | "forecast" | number | `pending:${string}`;

export function buildUsNavItems(returns: Record<number, TaxReturn>): NavItem[] {
  const years = Object.keys(returns)
    .map(Number)
    .sort((a, b) => b - a);
  const items: NavItem[] = [];
  if (years.length > 1) items.push({ id: "summary", label: "All time" });
  items.push(...years.map((y) => ({ id: String(y), label: String(y) })));
  return items;
}

export function buildIndiaNavItems(indiaReturns: Record<number, IndianTaxReturn>): NavItem[] {
  const years = Object.keys(indiaReturns)
    .map(Number)
    .sort((a, b) => b - a);
  const items: NavItem[] = [];
  if (years.length > 1) items.push({ id: "summary", label: "All years" });
  items.push(
    ...years.map((fy) => ({
      id: String(fy),
      label: `FY ${fy}-${String(fy + 1).slice(-2)}`,
    })),
  );
  return items;
}

export function getDefaultUsSelection(returns: Record<number, TaxReturn>): SelectedView {
  const years = Object.keys(returns)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return "summary";
  if (years.length === 1) return years[0] ?? "summary";
  return "summary";
}

export function getDefaultIndiaSelection(
  indiaReturns: Record<number, IndianTaxReturn>,
): SelectedView {
  const years = Object.keys(indiaReturns)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return "summary";
  if (years.length === 1) return years[0] ?? "summary";
  return "summary";
}

export function parseSelectedId(id: string): SelectedView {
  if (id === "summary") return "summary";
  if (id === "forecast") return "forecast";
  if (id.startsWith("pending:")) return id as `pending:${string}`;
  return Number(id);
}

/** Returns the most recent year nav item (first non-summary item), or undefined. */
export function getMostRecentYearItem(navItems: NavItem[]): NavItem | undefined {
  return navItems.find((item) => item.id !== "summary");
}
