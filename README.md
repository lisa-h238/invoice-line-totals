# invoice-line-totals

Every invoicing system ends up rewriting the same handful of calculations:
subtotal for a line, a discount taken off before tax, tax on what's left,
and a grand total across all lines. It's a handful of lines of arithmetic,
but it's easy to get the rounding wrong - do it in floating-point dollars
and you'll eventually produce an invoice that's off by a cent from what
the customer's accounting software expects.

This is a small library that does that arithmetic once, correctly, using
integer cents throughout instead of floating-point dollars. There's a
thin CLI on top for turning a JSON file of line items into a printed
summary.

## Library usage

```ts
import { summarizeInvoice, formatCents } from "./src/lineItem.js";

const summary = summarizeInvoice([
  { description: "Consulting hours", quantity: 8, unitPriceCents: 15000, discountPercent: 10, taxRatePercent: 7.5 },
  { description: "Software license", quantity: 1, unitPriceCents: 49900 },
]);

console.log(formatCents(summary.totalCents)); // "1,113.03"
```

Every exported function is pure: given the same `LineItem`s it always
returns the same numbers, and it never touches the filesystem, the clock,
or global state. That's what makes the CLI a thin wrapper rather than a
second implementation - it only handles reading input and printing output.

## CLI usage

Build once with `tsc` (see `package.json`), then run the compiled CLI
against a JSON file:

```json
{
  "items": [
    { "description": "Consulting hours", "quantity": 8, "unitPriceCents": 15000, "discountPercent": 10, "taxRatePercent": 7.5 },
    { "description": "Software license", "quantity": 1, "unitPriceCents": 49900 }
  ]
}
```

```
$ node dist/cli.js invoice.json
Consulting hours
  qty 8 x 150.00  subtotal 1,200.00  tax 81.00  total 1,161.00
Software license
  qty 1 x 499.00  subtotal 499.00  tax 0.00  total 499.00

subtotal 1,699.00
discount 120.00
tax      81.00
total    1,660.00
```

Omit the file argument to read from stdin instead:

```
$ cat invoice.json | node dist/cli.js
```

## Line item fields

| field             | required | meaning                                      |
|-------------------|----------|-----------------------------------------------|
| `description`     | yes      | free text, shown as-is                        |
| `quantity`        | yes      | may be fractional (e.g. 8.5 hours)            |
| `unitPriceCents`  | yes      | price per unit, in integer cents              |
| `discountPercent` | no       | 0-100, applied to the line subtotal           |
| `taxRatePercent`  | no       | 0-100, applied after the discount is taken off|

## Status

`src/lineItem.ts` has a unit test suite (`npm test`) covering rounding
behavior, discount-before-tax ordering, and invoice-level aggregation.
The CLI itself is still untested - see the roadmap for what's next.
