#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { calculateLineItemTotals, formatCents, summarizeInvoice, type LineItem } from "./lineItem.js";

function readInput(path: string | undefined): string {
  if (path) {
    return readFileSync(path, "utf8");
  }
  return readFileSync(0, "utf8"); // fd 0 is stdin
}

interface CliArgs {
  path?: string;
  currency?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--currency") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--currency requires a value, e.g. --currency EUR");
      }
      args.currency = value;
    } else if (args.path === undefined) {
      args.path = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  return args;
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

function printSummary(items: LineItem[], currency: string | undefined): void {
  const summary = summarizeInvoice(items);

  items.forEach((item) => {
    const totals = calculateLineItemTotals(item);
    console.log(`${item.description}`);
    console.log(`  qty ${item.quantity} x ${formatCents(item.unitPriceCents, currency)}  subtotal ${formatCents(totals.subtotalCents, currency)}  tax ${formatCents(totals.taxCents, currency)}  total ${formatCents(totals.totalCents, currency)}`);
  });

  console.log("");
  console.log(`subtotal ${formatCents(summary.subtotalCents, currency)}`);
  console.log(`discount ${formatCents(summary.discountCents, currency)}`);
  console.log(`tax      ${formatCents(summary.taxCents, currency)}`);
  console.log(`total    ${formatCents(summary.totalCents, currency)}`);
}

function main(): void {
  try {
    const { path, currency } = parseArgs(process.argv.slice(2));
    const items = parseLineItems(readInput(path));
    printSummary(items, currency);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
