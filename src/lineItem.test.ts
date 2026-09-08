import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateLineItemTotals, formatCents, summarizeInvoice } from "./lineItem.js";

test("calculateLineItemTotals multiplies quantity by unit price", () => {
  const totals = calculateLineItemTotals({
    description: "Software license",
    quantity: 1,
    unitPriceCents: 49900,
  });

  assert.deepEqual(totals, {
    subtotalCents: 49900,
    discountCents: 0,
    taxableCents: 49900,
    taxCents: 0,
    totalCents: 49900,
  });
});

test("calculateLineItemTotals applies discount before tax", () => {
  const totals = calculateLineItemTotals({
    description: "Consulting hours",
    quantity: 8,
    unitPriceCents: 15000,
    discountPercent: 10,
    taxRatePercent: 7.5,
  });

  assert.deepEqual(totals, {
    subtotalCents: 120000,
    discountCents: 12000,
    taxableCents: 108000,
    taxCents: 8100,
    totalCents: 116100,
  });
});

test("calculateLineItemTotals rounds discount half-up to the nearest cent", () => {
  // 101 * 50% = 50.5, which must round up to 51, not down to 50.
  const totals = calculateLineItemTotals({
    description: "Half-cent discount",
    quantity: 1,
    unitPriceCents: 101,
    discountPercent: 50,
  });

  assert.equal(totals.discountCents, 51);
  assert.equal(totals.taxableCents, 50);
});

test("calculateLineItemTotals rounds tax half-up to the nearest cent", () => {
  // 51 * 50% = 25.5, which must round up to 26.
  const totals = calculateLineItemTotals({
    description: "Half-cent tax",
    quantity: 1,
    unitPriceCents: 51,
    taxRatePercent: 50,
  });

  assert.equal(totals.taxCents, 26);
  assert.equal(totals.totalCents, 77);
});

test("calculateLineItemTotals supports fractional quantities", () => {
  const totals = calculateLineItemTotals({
    description: "Partial hours",
    quantity: 2.5,
    unitPriceCents: 10000,
  });

  assert.equal(totals.subtotalCents, 25000);
});

test("summarizeInvoice sums per-line totals across the whole invoice", () => {
  const items = [
    { description: "Consulting hours", quantity: 8, unitPriceCents: 15000, discountPercent: 10, taxRatePercent: 7.5 },
    { description: "Software license", quantity: 1, unitPriceCents: 49900 },
  ];

  const summary = summarizeInvoice(items);

  assert.equal(summary.lines.length, 2);
  assert.equal(summary.subtotalCents, 169900);
  assert.equal(summary.discountCents, 12000);
  assert.equal(summary.taxCents, 8100);
  assert.equal(summary.totalCents, 166000);
});

test("summarizeInvoice returns zeroed totals for an empty invoice", () => {
  const summary = summarizeInvoice([]);

  assert.deepEqual(summary, {
    lines: [],
    subtotalCents: 0,
    discountCents: 0,
    taxCents: 0,
    totalCents: 0,
  });
});

test("formatCents inserts thousands separators and two decimal places", () => {
  assert.equal(formatCents(104999), "1,049.99");
  assert.equal(formatCents(0), "0.00");
  assert.equal(formatCents(5), "0.05");
});

test("formatCents renders negative amounts with a leading minus sign", () => {
  assert.equal(formatCents(-500), "-5.00");
});
