/**
 * The report catalogue, in one place.
 *
 * Slugs match `available()` in backend/app/routes/../services/report_service.py,
 * and the same three appear in the app's `_reports` list. Adding a fourth means
 * a query module on the server and one entry here — the endpoints, the table,
 * the download and the publish buttons are all slug-driven.
 *
 * Only the *presentation* lives here. Columns, labels, number formats and the
 * summary figures all come from the server with the data, because the report
 * module is the thing that knows them — and if the client kept its own copy,
 * the table on screen and the file in Drive would eventually disagree.
 */
export const REPORTS = [
  {
    slug: 'farmer-stock',
    name: 'Farmers & stock',
    blurb: 'Every farmer with their products and what is left in stock. Farms '
      + 'that have listed nothing are included, so you can see who signed up '
      + 'and never added produce.',
    cadence: 'every 2 days',
  },
  {
    slug: 'basket-orders',
    name: 'Upcoming weekly baskets',
    blurb: 'Basket deliveries due over the next fortnight, one row per product, '
      + 'with quantity and price. Sort by product to see how much of each thing '
      + 'has to be sourced.',
    cadence: 'every 2 days',
  },
  {
    slug: 'buying-plan',
    name: 'Buying plan',
    blurb: 'What to buy for the next basket delivery, and from which farm — '
      + 'cheapest first, with anything short of stock flagged. Built by '
      + 'matching what the baskets need against what the farms have.',
    cadence: 'every 2 days',
  },
]

export const reportBySlug = (slug) => REPORTS.find((r) => r.slug === slug)

/**
 * Turn a summary key into a readable label — `out_of_stock` → `Out of stock`.
 *
 * Each report names its own headline figures, so hardcoding a label map here
 * would mean editing this file every time one changes. Deriving them keeps a
 * new figure working the moment the server starts sending it.
 */
export const humanise = (key) =>
  key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

/** Money-ish summary keys, so totals render as rupees rather than bare numbers. */
export const isMoneyKey = (key) => /cost|value|total|revenue|paid/i.test(key)

/**
 * Format one cell for display.
 *
 * The server sends a `format` per column — `money`, `quantity`, `integer`,
 * `date` — the same hints the spreadsheet builder uses, so a price is a price
 * in both places.
 */
export function formatCell(value, format) {
  if (value === null || value === undefined || value === '') return '—'
  if (format === 'money') return `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (format === 'quantity') return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 })
  if (format === 'integer') return Number(value).toLocaleString('en-IN')
  return String(value)
}
