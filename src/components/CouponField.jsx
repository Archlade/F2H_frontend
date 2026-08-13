import { useState, useEffect, useRef, useCallback } from 'react'
import { Tag, X, Loader2 } from 'lucide-react'
import { couponsAPI } from '../api'

/**
 * "Have a coupon code?" — collapsed by default, expands to a code box.
 *
 * Checking a code does not reserve it: the server only claims a coupon when the
 * order is created. So a code can validate here and still be gone by the time
 * the order is placed, which is why the checkout form surfaces the server's
 * error rather than trusting this preview.
 *
 * @param {number} subtotal  Pre-discount total the coupon is checked against.
 * @param {function} onChange  Called with { code, discount, label } or null.
 * @param {boolean} recurringNote  Weekly baskets: says the code applies once.
 */
export default function CouponField({ subtotal, onChange, recurringNote = false }) {
  const [expanded, setExpanded] = useState(false)
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [applied, setApplied] = useState(null)

  // onChange is usually an inline arrow, so depending on it directly would
  // re-run the effect below on every parent render.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const emit = useCallback((value) => {
    setApplied(value)
    onChangeRef.current?.(value)
  }, [])

  // The order total drives the discount, so changing the quantity has to
  // re-check the code: a percentage coupon's value moves with the subtotal,
  // and a minimum-spend coupon can stop qualifying entirely.
  const appliedCode = applied?.code
  useEffect(() => {
    if (!appliedCode) return

    let cancelled = false
    const recheck = async () => {
      try {
        const { data } = await couponsAPI.preview(appliedCode, subtotal)
        if (cancelled) return
        if (data.valid) {
          emit({ code: appliedCode, discount: data.discount, label: data.coupon?.label || '' })
        } else {
          // No longer qualifies — drop it and say why, rather than silently
          // charging a total the customer didn't expect.
          setError(data.error)
          emit(null)
        }
      } catch {
        // A network blip shouldn't strip a coupon already applied.
      }
    }
    recheck()
    return () => { cancelled = true }
  }, [appliedCode, subtotal, emit])

  const apply = async () => {
    const cleaned = code.trim().toUpperCase()
    if (!cleaned) { setError('Enter a coupon code'); return }

    setChecking(true)
    setError(null)
    try {
      const { data } = await couponsAPI.preview(cleaned, subtotal)
      if (!data.valid) {
        setError(data.error || 'That coupon is not valid')
        emit(null)
        return
      }
      emit({ code: cleaned, discount: data.discount, label: data.coupon?.label || '' })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not check that code')
    } finally {
      setChecking(false)
    }
  }

  const remove = () => {
    setCode('')
    setError(null)
    emit(null)
  }

  // Enter inside a checkout form would otherwise submit the order.
  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      apply()
    }
  }

  if (applied) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 12,
        background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: 'var(--color-primary-100)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Tag size={17} color="var(--color-primary-700)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <span style={{
              fontWeight: 700, letterSpacing: '0.06em',
              color: 'var(--color-primary-800)', fontSize: '0.875rem',
            }}>
              {applied.code}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-primary-700)' }}>
              −₹{applied.discount.toFixed(2)}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--color-primary-700)' }}>
            {recurringNote ? `${applied.label} · applies to your first basket` : applied.label}
          </div>
        </div>
        <button
          type="button"
          onClick={remove}
          className="btn btn-ghost btn-icon"
          aria-label="Remove coupon"
          style={{ color: 'var(--color-primary-700)', minWidth: 36, minHeight: 36 }}
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0',
          background: 'none', border: 'none', cursor: 'pointer', width: '100%',
        }}
      >
        <Tag size={16} color="var(--color-primary-600)" />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-primary-700)' }}>
          Have a coupon code?
        </span>
      </button>
    )
  }

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="coupon-code">Coupon code</label>
      <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
        <input
          id="coupon-code"
          className="form-input"
          placeholder="e.g. FRESH50"
          value={code}
          autoFocus
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={onKeyDown}
          style={{ letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}
        />
        <button
          type="button"
          className="btn btn-primary touch-target"
          onClick={apply}
          disabled={checking}
          style={{ flexShrink: 0 }}
        >
          {checking ? <Loader2 size={16} className="spin" /> : 'Apply'}
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}

/**
 * The price breakdown under a checkout form: subtotal, discount, total.
 * Collapses to a single line when nothing is discounted, so an ordinary order
 * doesn't grow two redundant rows.
 */
export function OrderTotals({ subtotal, discount = 0, note }) {
  const total = Math.max(subtotal - discount, 0)

  return (
    <div style={{
      padding: 16, background: 'var(--color-primary-50)',
      borderRadius: 'var(--radius-lg)',
    }}>
      {discount > 0 && (
        <>
          <div className="flex-between text-sm" style={{ color: 'var(--color-primary-800)' }}>
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex-between text-sm" style={{ marginTop: 4, color: 'var(--color-primary-700)', fontWeight: 600 }}>
            <span>Coupon discount</span>
            <span>−₹{discount.toFixed(2)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--color-primary-200)', margin: '10px 0' }} />
        </>
      )}
      <div className="flex-between" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-primary-800)' }}>
            {discount > 0 ? 'You pay' : 'Estimated total'}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.375rem', color: 'var(--color-gray-900)' }}>
            ₹{total.toFixed(2)}
          </div>
        </div>
        {note && (
          <div className="text-xs" style={{ textAlign: 'right', color: 'var(--color-primary-700)' }}>
            {note}
          </div>
        )}
      </div>
    </div>
  )
}
