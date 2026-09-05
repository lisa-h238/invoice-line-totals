#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { calculateLineItemTotals, formatCents, summarizeInvoice, type LineItem } from "./lineItem.js";

function readInput(path: string | undefined): string {
  if (path) {
    return readFileSync(path, "utf8");
  }
  return readFileSync(0, "utf8"); // fd 0 is stdin
}

/** Parsing and shape-checking is the only impure, unvalidated boundary; everything past this is the pure library. */
function parseLineItems(raw: string): LineItem[] {
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : data.items;

  if (!Array.isArray(items)) {
    throw new Error('input must be a JSON array of line items, or an object with an "items" array');
  }

  return items.map((item, index) => {
    if (typeof item.description !== "string" || typeof item.quantity !== "number" || typeof item.unitPriceCents !== "number") {
      throw new Error(`line item at index ${index} is missing description, quantity, or unitPriceCents`);
    }
    return item as LineItem;
  });
}

function printSummary(items: LineItem[]): void {
  const summary = summarizeInvoice(items);

  items.forEach((item) => {
    const totals = calculateLineItemTotals(item);
    console.log(`${item.description}`);
    console.log(`  qty ${item.quantity} x ${formatCents(item.unitPriceCents)}  subtotal ${formatCents(totals.subtotalCents)}  tax ${formatCents(totals.taxCents)}  total ${formatCents(totals.totalCents)}`);
  });

  console.log("");
  console.log(`subtotal ${formatCents(summary.subtotalCents)}`);
  console.log(`discount ${formatCents(summary.discountCents)}`);
  console.log(`tax      ${formatCents(summary.taxCents)}`);
  console.log(`total    ${formatCents(summary.totalCents)}`);
}

function main(): void {
  const path = process.argv[2];
  try {
    const items = parseLineItems(readInput(path));
    printSummary(items);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
