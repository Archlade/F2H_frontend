import { useState } from 'react'
import { Banknote, CheckCircle, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { paymentsAPI } from '../api'

/**
 * What an order owes in cash, and — for the seller — the control that records
 * it once the money is in hand.
 *
 * The two sides read this differently, which is the whole design:
 *
 *  * **The customer** is being told what to have ready. There is no button:
 *    nothing on a web page moves cash, because the cash moves at a door.
 *  * **The farmer or admin** is being told what to ask for, and gets the one
 *    control that writes it down.
 *
 * Renders nothing at all when there is nothing to settle, so orders placed
 * before payment tracking existed look exactly as they always did.
 *
 * Everything here is driven from fields the order already carries
 * (`payment_status`, `total_price`, `status`), so a list of twenty orders costs
 * no extra requests. The server re-checks authority and order state on the way
 * in regardless — this only decides what is worth drawing.
 */

// Before these the produce has not reached the customer, so there is nobody to
// take money from. Mirrors COLLECTABLE_STATUSES in backend/app/routes/payments.py.
const COLLECTABLE = ['ready_for_pickup', 'out_for_delivery', 'cash_collected', 'completed']

export default function CashOnDelivery({ order, orderType, canCollect = false, onCollected }) {
  const [busy, setBusy] = useState(false)

  const state = order?.payment_status
  const amount = Number(order?.total_price || 0)

  if (!state || state === 'not_required') return null

  const collectable = canCollect && state === 'pending' && COLLECTABLE.includes(order?.status)

  const record = async () => {
    // Asked before recording, not after. This is the irreversible half of a
    // cash sale — once written down the customer is told they have paid and
    // nobody chases the money again — and the only thing between a mis-click
    // and that is this question.
    const ok = window.confirm(
      `Confirm you have received ₹${amount.toFixed(2)} in cash from the customer.\n\n` +
      'They will be told the order is paid. This cannot be undone here.'
    )
    if (!ok) return

    setBusy(true)
    try {
      await paymentsAPI.collect(orderType, order.id)
      toast.success('Cash payment recorded')
      onCollected?.()
    } catch (err) {
      // Retrying is safe — collection is idempotent server-side — so a failure
      // here never means "ask the customer again".
      toast.error(err.response?.data?.error || 'Could not record that payment')
    } finally {
      setBusy(false)
    }
  }

  if (state === 'paid') {
    return (
      <Band tone="success" icon={<CheckCircle size={15} />}>
        Paid ₹{amount.toFixed(2)} in cash
      </Band>
    )
  }

  if (state === 'refunded') {
    return (
      <Band tone="muted" icon={<Undo2 size={15} />}>
        Refunded — ₹{amount.toFixed(2)} returned in cash
      </Band>
    )
  }

  // state === 'pending'
  if (!collectable) {
    return (
      <Band tone="warn" icon={<Banknote size={15} />}>
        Cash on delivery — ₹{amount.toFixed(2)} due
      </Band>
    )
  }

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        borderRadius: 'var(--radius-lg, 12px)',
        background: 'var(--color-accent-50, #FFFBEB)',
        border: '1px solid var(--color-accent-200, #FDE68A)',
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{ fontWeight: 700, color: 'var(--color-accent-800, #92400E)', fontSize: '0.9375rem' }}
      >
        <Banknote size={15} />
        Collect ₹{amount.toFixed(2)} in cash
      </div>
      <p className="text-xs" style={{ margin: '4px 0 10px', color: 'var(--color-gray-600)' }}>
        Take the money when you hand the order over, then record it here. The order
        cannot be marked complete until you do.
      </p>
      <button
        className="btn btn-success btn-sm font-bold"
        style={{ borderRadius: 'var(--radius-full)' }}
        onClick={record}
        disabled={busy}
      >
        <CheckCircle size={14} /> {busy ? 'Recording…' : `Received ₹${amount.toFixed(2)}`}
      </button>
    </div>
  )
}

const TONES = {
  success: ['var(--color-primary-50, #F0FDF4)', 'var(--color-primary-800, #166534)'],
  warn: ['var(--color-accent-50, #FFFBEB)', 'var(--color-accent-800, #92400E)'],
  muted: ['var(--color-gray-100, #F3F4F6)', 'var(--color-gray-700, #374151)'],
}

function Band({ tone, icon, children }) {
  const [background, color] = TONES[tone] ?? TONES.muted
  return (
    <div
      className="flex items-center gap-2 text-xs"
      style={{
        marginTop: 8,
        padding: '7px 10px',
        borderRadius: 'var(--radius-md, 8px)',
        background,
        color,
        fontWeight: 600,
      }}
    >
      {icon}
      {children}
    </div>
  )
}
