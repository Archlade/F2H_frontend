/**
 * How much of a product a customer may order.
 *
 * The browser half of `backend/app/utils/quantity.py`, and deliberately a port
 * of it rather than a second opinion. Before this file the website stepped
 * every quantity by 0.5 — a hardcoded literal in the product page and another
 * in the cart — which offered half a coconut, a sixth of a dozen eggs, and half
 * a gram per press on a product sold from 250 g.
 *
 * Three rules:
 *
 * * **Countable things are sold whole.** `piece`, `bundle`, `dozen` and `box`
 *   step by one; weights and volumes divide.
 * * **The step is never coarser than the minimum.** Grams step by 50, except on
 *   a listing whose minimum is 10 g, which steps by 10.
 * * **The grid starts at the minimum, not at zero.** A 0.25 kg minimum gives
 *   0.25, 0.5, 0.75, 1 — not the 0.25, 0.75, 1.25 that stepping by a fixed 0.5
 *   produced, which never reaches a round number.
 *
 * The server sends `quantity_step` and `min_orderable_quantity` on every
 * product, so these functions prefer those figures and fall back to the rule
 * only for a payload that predates them. The server re-validates regardless —
 * nothing here is a check, it is what the buttons offer.
 */

const DISCRETE_UNITS = new Set(['piece', 'bundle', 'dozen', 'box'])

// Declared in the order the `products.unit` enum does, because UNIT_OPTIONS
// takes its dropdown order from these keys and the app lists ProductUnit.values.
const UNIT_STEP = {
  kg: 0.5,
  gram: 50,
  litre: 0.5,
  ml: 50,
  piece: 1,
  bundle: 1,
  dozen: 1,
  box: 1,
}

// An unrecognised unit divides by half, the same as kg. Refusing one outright
// would take a listing off sale over a schema change.
const DEFAULT_STEP = 0.5

// `quantity` is NUMERIC(10,3) in the database.
const DECIMALS = 3

/** Rounds away the binary noise in sums like 0.1 + 0.5 = 0.6000000000000001. */
export const round3 = (value) => Number(Number(value).toFixed(DECIMALS))

export const isDiscrete = (unit) => DISCRETE_UNITS.has(unit)

const UNIT_LABEL = { gram: 'g', litre: 'L' }

/** How a unit is written to a customer: "250 g", not "250 gram". */
export const unitLabel = (unit) => UNIT_LABEL[unit] || unit || ''

/**
 * Every unit a product may be sold in, for a dropdown.
 *
 * `value` is what the database accepts; `label` is what a person reads. The two
 * were conflated in three separate hardcoded lists — the farmer product form,
 * the admin basket-item form and its app equivalent — each of which offered
 * `g`, `bunch` and `packet` as *values*. None of those is in the
 * `products.unit` enum, so picking one came back as "'g' is not a unit we
 * support" after the farmer had filled in the whole form. `lb` was on the
 * farmer form too, and has never existed anywhere else.
 *
 * Derived from the step table rather than typed out again, so a unit added to
 * the schema has exactly one place to be added here.
 */
export const UNIT_OPTIONS = Object.keys(UNIT_STEP).map((value) => ({
  value,
  label: unitLabel(value),
}))

/** A finite number, or null — `Number('')` is 0 and `Number('abc')` is NaN. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

/**
 * The smallest orderable amount.
 *
 * A countable unit rounds its minimum up to a whole one: a farmer who typed 1.5
 * into the minimum box for eggs has described an amount nobody can hand over.
 */
export function minQuantity(product) {
  if (!product) return 1
  const sent = toNumber(product.min_orderable_quantity)
  if (sent !== null && sent > 0) return round3(sent)

  const raw = toNumber(product.min_quantity) ?? 0
  if (isDiscrete(product.unit)) return Math.max(1, Math.ceil(raw))
  return raw > 0 ? round3(raw) : stepFor(product)
}

/** How much one press of plus or minus moves the amount. */
export function stepFor(product) {
  if (!product) return DEFAULT_STEP
  const sent = toNumber(product.quantity_step)
  if (sent !== null && sent > 0) return round3(sent)

  const step = UNIT_STEP[product.unit] ?? DEFAULT_STEP
  if (isDiscrete(product.unit)) return step

  const raw = toNumber(product.min_quantity) ?? 0
  return raw > 0 && raw < step ? round3(raw) : step
}

/**
 * The most that may be ordered, or `Infinity` when there is no shelf behind it.
 *
 * A basket-only item is sourced by F2H against the baskets actually ordered, so
 * its `available_quantity` is not a figure anybody maintains — checking it
 * would read as "none left".
 */
export function maxQuantity(product) {
  if (!product) return Infinity
  if (product.basket_only) return Infinity
  const available = toNumber(product.available_quantity)
  return available === null ? Infinity : round3(available)
}

/** The nearest amount this product is actually sold in, inside its bounds. */
export function snapQuantity(product, value) {
  const min = minQuantity(product)
  const step = stepFor(product)
  const max = maxQuantity(product)

  const amount = toNumber(value)
  if (amount === null || amount <= min) return min

  // Nearest rather than down: somebody typing 0.9 on a half-kilo product means
  // 1, and being handed 0.5 reads as the field ignoring them.
  let snapped = round3(min + Math.round((amount - min) / step) * step)
  if (snapped > max) {
    snapped = round3(min + Math.max(0, Math.floor((max - min) / step)) * step)
  }
  return snapped
}

/** Whether a quantity may be reduced — false once it is at the minimum. */
export const canDecrease = (product, value) =>
  round3((toNumber(value) ?? 0) - stepFor(product)) >= minQuantity(product) - 1e-6

/** Whether a quantity may be increased — false once the shelf is reached. */
export const canIncrease = (product, value) =>
  round3((toNumber(value) ?? 0) + stepFor(product)) <= maxQuantity(product) + 1e-6

/** `3` rather than `3.000`; `1.5` stays `1.5`. */
export function formatQuantity(value) {
  const amount = toNumber(value)
  if (amount === null) return '0'
  return String(round3(amount))
}

export const withUnit = (value, unit) =>
  `${formatQuantity(value)}${unit ? ` ${unitLabel(unit)}` : ''}`

// "10 pieces available", not "10 piece available". Only the countable units
// take an -s; a weight is already uncountable.
const PLURAL = { piece: 'pieces', bundle: 'bundles', box: 'boxes', dozen: 'dozen' }

const pluralUnit = (value, unit) =>
  (toNumber(value) ?? 0) === 1 ? unitLabel(unit) : (PLURAL[unit] || unitLabel(unit))

/**
 * What to say under the stepper: the step, the minimum and what is left.
 *
 * Shown always rather than only on a refusal, because the rule is what stops
 * the refusal happening — a stepper that silently declines to move past 10 is
 * the version customers reported as broken.
 */
export function quantityHint(product) {
  if (!product) return ''
  const unit = unitLabel(product.unit)
  const parts = [`min ${formatQuantity(minQuantity(product))} ${unit}`.trim()]
  if (!isDiscrete(product.unit)) {
    parts.push(`steps of ${formatQuantity(stepFor(product))} ${unit}`.trim())
  }
  const max = maxQuantity(product)
  if (Number.isFinite(max)) {
    parts.push(`${formatQuantity(max)} ${pluralUnit(max, product.unit)}`.trim() + ' available')
  }
  return parts.join(' · ')
}
