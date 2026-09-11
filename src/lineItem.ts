/**
 * All money amounts are integer cents. Line items carry a fractional
 * quantity and percentages, so every intermediate amount is rounded to
 * the nearest cent before it feeds into the next calculation - otherwise
 * two invoices with the same totals can render one cent apart depending
 * on how the arithmetic happened to associate.
 */

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  /** 0-100. Applied to the line subtotal before tax. */
  discountPercent?: number;
  /** 0-100. Applied to the line subtotal after discount. */
  taxRatePercent?: number;
}

export interface LineItemTotals {
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  totalCents: number;
}

export interface InvoiceSummary {
  lines: LineItemTotals[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Round to the nearest integer cent, half away from zero. A credit line
 * (negative quantity) has to produce amounts that are the exact negation
 * of the equivalent positive line - Math.round alone rounds -25.5 to -25
 * while rounding 25.5 to 26, which would make a refund one cent short of
 * the charge it's reversing.
 */
function roundCents(amount: number): number {
  return amount < 0 ? -Math.round(-amount) : Math.round(amount);
}

export function calculateLineItemTotals(item: LineItem): LineItemTotals {
  const discountPercent = item.discountPercent ?? 0;
  const taxRatePercent = item.taxRatePercent ?? 0;

  const subtotalCents = roundCents(item.quantity * item.unitPriceCents);
  const discountCents = roundCents(subtotalCents * (discountPercent / 100));
  const taxableCents = subtotalCents - discountCents;
  const taxCents = roundCents(taxableCents * (taxRatePercent / 100));
  const totalCents = taxableCents + taxCents;

  return { subtotalCents, discountCents, taxableCents, taxCents, totalCents };
}

export function summarizeInvoice(items: readonly LineItem[]): InvoiceSummary {
  const lines = items.map(calculateLineItemTotals);

  return lines.reduce<InvoiceSummary>(
    (summary, line) => ({
      lines: [...summary.lines, line],
      subtotalCents: summary.subtotalCents + line.subtotalCents,
      discountCents: summary.discountCents + line.discountCents,
      taxCents: summary.taxCents + line.taxCents,
      totalCents: summary.totalCents + line.totalCents,
    }),
    { lines: [], subtotalCents: 0, discountCents: 0, taxCents: 0, totalCents: 0 },
  );
}

/** Format cents as a decimal currency string, e.g. 104999 -> "1,049.99". */
export function formatCents(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = Math.floor(absolute / 100);
  const remainder = String(absolute % 100).padStart(2, "0");
  const withThousands = dollars.toLocaleString("en-US");
  return `${negative ? "-" : ""}${withThousands}.${remainder}`;
}
