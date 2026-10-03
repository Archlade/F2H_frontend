import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

import {
  canDecrease, canIncrease, formatQuantity, maxQuantity,
  minQuantity, snapQuantity, stepFor, toNumber, unitLabel,
} from '../utils/quantity'

/**
 * Choosing how much of a product to buy.
 *
 * One component for the product page and the cart, because two copies is how
 * they came to disagree: both stepped by a hardcoded 0.5 regardless of unit,
 * so a product sold by the piece offered half of one, and a product sold from
 * 250 g moved half a gram per press.
 *
 * The typed field keeps the raw string while it is being edited and only
 * commits on blur or Enter. Parsing every keystroke — which is what the product
 * page did — makes a decimal impossible to type: "1." becomes 1 the moment the
 * point is pressed, and clearing the field to retype it becomes 0.
 *
 * On commit the amount is snapped onto the grid the product is sold in rather
 * than refused, so "1.3" on a half-kilo listing becomes 1.5 and says so.
 */
export default function QuantityStepper({
  product,
  value,
  onChange,
  /**
   * Keep the minus key live *at* the minimum, reporting a value below it.
   *
   * The cart wants this: a dead button explains nothing, and the press is worth
   * answering with the reason and a pointer at the bin. The product page does
   * not — there is nothing to remove there, so the key simply stops.
   */
  allowBelowMin = false,
  disabled = false,
  compact = false,
  editable = true,
  onSnap,
}) {
  const min = minQuantity(product)
  const max = maxQuantity(product)
  const step = stepFor(product)
  const unit = unitLabel(product?.unit)

  // The field's own text, so a half-typed "1." survives until it is committed.
  const [draft, setDraft] = useState(formatQuantity(value))
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!editing) setDraft(formatQuantity(value))
  }, [value, editing])

  const emit = (next) => {
    if (next !== Number(value)) onChange(next)
  }

  const commitDraft = () => {
    setEditing(false)
    const typed = toNumber(draft)
    if (typed === null) { setDraft(formatQuantity(value)); return }

    const snapped = snapQuantity(product, typed)
    setDraft(formatQuantity(snapped))
    // Reported so the caller can say what happened. An amount silently
    // corrected under somebody's cursor is the other way this field felt broken.
    if (onSnap && Math.abs(snapped - typed) > 1e-6) onSnap(snapped, typed)
    emit(snapped)
  }

  const decreasable = !disabled
    && (allowBelowMin ? (toNumber(value) ?? 0) >= min - 1e-6 : canDecrease(product, value))
  const increasable = !disabled && canIncrease(product, value)

  const size = compact ? 34 : 42
  const keyStyle = (enabled) => ({
    width: size, height: size, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', padding: 0,
    borderRadius: 'var(--radius-md)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? 'var(--color-gray-700)' : 'var(--color-gray-300)',
  })

  return (
    <div
      className="flex items-center"
      style={{
        border: '1.5px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-md)',
        background: 'white',
        width: 'fit-content',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        style={keyStyle(decreasable)}
        disabled={!decreasable}
        onClick={() => emit(round(Number(value) - step))}
        aria-label={`Reduce by ${formatQuantity(step)} ${unit}`.trim()}
      >
        <Minus size={compact ? 14 : 16} />
      </button>

      {editable ? (
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          disabled={disabled}
          onFocus={() => setEditing(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
          aria-label={`Quantity in ${unit || 'units'}`}
          style={{
            width: compact ? 48 : 60, border: 'none', outline: 'none',
            textAlign: 'center', fontWeight: 600, fontSize: compact ? '0.875rem' : '1rem',
            background: 'transparent', color: 'var(--color-gray-800)', padding: 0,
          }}
        />
      ) : (
        <span style={{
          minWidth: compact ? 48 : 60, textAlign: 'center',
          fontWeight: 600, fontSize: compact ? '0.875rem' : '1rem',
        }}>
          {formatQuantity(value)}
        </span>
      )}

      {unit && (
        <span className="text-xs text-muted" style={{ paddingRight: 8, whiteSpace: 'nowrap' }}>
          {unit}
        </span>
      )}

      <button
        type="button"
        style={keyStyle(increasable)}
        disabled={!increasable}
        onClick={() => emit(round(Number(value) + step))}
        aria-label={
          increasable
            ? `Add ${formatQuantity(step)} ${unit}`.trim()
            : `No more than ${formatQuantity(max)} ${unit} available`.trim()
        }
      >
        <Plus size={compact ? 14 : 16} />
      </button>
    </div>
  )
}

// Keeps the running total off the binary fringe: 0.1 + 0.5 is
// 0.6000000000000001, and the column it lands in holds three decimals.
const round = (value) => Number(Number(value).toFixed(3))
