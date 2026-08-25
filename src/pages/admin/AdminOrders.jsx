import { useEffect, useState } from 'react'
import { Loader, Package, Phone, MapPin, ExternalLink, Banknote, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI, requestsAPI, familyPackOrdersAPI, toList } from '../../api'
import OrderPrice from '../../components/OrderPrice'

/**
 * Every order in the platform, with the two things an admin needs when
 * something goes wrong: a phone number for each side, and a link to where it is
 * going.
 *
 * Purchase requests and weekly basket deliveries are merged server-side, so
 * both appear in one list — an admin chasing a late delivery does not care
 * which table a row came from.
 *
 * The contact numbers are admin-only. No customer-facing endpoint returns the
 * other party's number, which is why this reads from `/admin/orders` rather
 * than reusing the ordinary order list.
 */

const FILTERS = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['preparing', 'Preparing'],
  // Where the farmer gets paid, so it is the filter an admin doing a collection
  // round actually wants.
  ['picked_up', 'Picked up'],
  ['out_for_delivery', 'Out for delivery'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

const rupees = (n) => `₹${Number(n || 0).toFixed(2)}`

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  // Loaded once for the assign dropdowns. Kept here rather than fetched
  // per row — fifty orders would otherwise mean fifty identical requests.
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  // Bumped to force a refetch after a pickup is recorded, so the row redraws
  // with the payment on it rather than being patched in place.
  const [tick, setTick] = useState(0)
  const reload = () => setTick(t => t + 1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminAPI
      .orders({ status: status || undefined, per_page: 50 })
      .then(res => {
        if (cancelled) return
        setOrders(toList(res.data))
        setTotal(res.data?.total ?? 0)
      })
      .catch(err => {
        if (!cancelled) toast.error(err.response?.data?.error || 'Failed to load orders')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [status, tick])

  useEffect(() => {
    adminAPI.deliveryPartners()
      .then((res) => setPartners((res.data || []).filter((p) => p.is_active)))
      // A failure here costs the dropdown, not the page. The orders are
      // still readable and every other control still works.
      .catch(() => {})
  }, [])

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 20 }}>
        <h1 className="text-h2">All orders</h1>
        <p className="text-sm text-muted">
          {loading ? 'Loading…' : `${total} order${total === 1 ? '' : 's'} across the platform`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 18 }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${status === value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)' }}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state text-center p-12" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No orders</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map(o => (
            <div key={`${o.order_type}-${o.id}`} className="card" style={{ padding: 16, borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="font-bold text-dark">{o.title}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    {o.order_type === 'request' ? 'Order' : 'Basket'} #{o.id}
                    {o.created_at && ` · ${new Date(o.created_at).toLocaleDateString()}`}
                    {o.purchase_mode && ` · ${o.purchase_mode.replace('_', ' ')}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <OrderPrice order={o} align="right" size="sm" />
                  <span className={`badge status-${o.status} capitalize`} style={{ marginTop: 4, display: 'inline-block' }}>
                    {o.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {o.payment_status === 'pending' && (
                <div className="text-xs" style={{ marginTop: 8, color: 'var(--color-accent-800, #92400E)', fontWeight: 600 }}>
                  Cash on delivery — {rupees(o.total_price)} due from the customer
                </div>
              )}

              <FarmerPickup order={o} onChanged={reload} />

              <AssignDelivery order={o} partners={partners} onChanged={reload} />

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Party label="Buyer" contact={o.customer} />
                <Party label="Seller" contact={o.farmer} />
              </div>

              {o.delivery?.maps_url && (
                <a
                  href={o.delivery.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm"
                  style={{ marginTop: 10, color: 'var(--color-primary-700)', fontWeight: 600 }}
                >
                  <MapPin size={15} />
                  <span>{o.delivery.address || 'Open in Google Maps'}</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The farmer's side of the money: what they are owed at pickup, or what they got.
 *
 * Marking an order picked up is what pays the farmer — the server records the
 * cash against the payment row in the same transaction as the status change.
 * There is no separate "pay the farmer" action, deliberately: two buttons would
 * mean an order could be collected without payment or paid without collection,
 * and both of those are a farmer standing in a field arguing about money.
 */
function FarmerPickup({ order, onChanged }) {
  const [busy, setBusy] = useState(false)
  const fp = order.farmer_payment

  // Nothing frozen yet — the order has not been confirmed, so no share exists.
  if (!fp) return null

  // Nothing owed to a farmer: a weekly basket F2H sources and sells itself.
  // The growers behind it are paid separately, so a "pay the farmer ₹0.00"
  // band here would be noise on every basket in the list.
  if (!fp.paid_at && Number(fp.due) <= 0) return null

  if (fp.paid_at) {
    return (
      <div
        className="flex items-center gap-2 text-xs"
        style={{
          marginTop: 8, padding: '7px 10px', borderRadius: 'var(--radius-md, 8px)',
          background: 'var(--color-primary-50, #F0FDF4)',
          color: 'var(--color-primary-800, #166534)', fontWeight: 600,
        }}
      >
        <Banknote size={14} />
        Farmer paid {rupees(fp.paid_amount ?? fp.due)} in cash at pickup
        {' · '}{new Date(fp.paid_at).toLocaleDateString()}
      </div>
    )
  }

  const canPickUp = order.status === 'preparing'

  if (!canPickUp) {
    return (
      <div className="text-xs" style={{ marginTop: 8, color: 'var(--color-gray-600)', fontWeight: 600 }}>
        Farmer to be paid {rupees(fp.due)} at pickup
      </div>
    )
  }

  const record = async () => {
    const ok = window.confirm(
      `Confirm you have collected this order from the farm and handed the farmer ` +
      `${rupees(fp.due)} in cash.\n\n` +
      'This is recorded as their payment for this order and cannot be undone here.'
    )
    if (!ok) return

    setBusy(true)
    try {
      const api = order.order_type === 'request' ? requestsAPI : familyPackOrdersAPI
      await api.updateStatus(order.id, { status: 'picked_up' })
      toast.success(`Picked up — farmer paid ${rupees(fp.due)}`)
      onChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not record the pickup')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 8, padding: 12, borderRadius: 'var(--radius-lg, 12px)',
        background: 'var(--color-accent-50, #FFFBEB)',
        border: '1px solid var(--color-accent-200, #FDE68A)',
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{ fontWeight: 700, color: 'var(--color-accent-800, #92400E)', fontSize: '0.9375rem' }}
      >
        <Banknote size={15} />
        Pay the farmer {rupees(fp.due)} at pickup
      </div>
      <p className="text-xs" style={{ margin: '4px 0 10px', color: 'var(--color-gray-600)' }}>
        Hand over the cash when you collect the produce, then record it here.
      </p>
      <button
        className="btn btn-success btn-sm font-bold"
        style={{ borderRadius: 'var(--radius-full)' }}
        onClick={record}
        disabled={busy}
      >
        <CheckCircle size={14} />
        {busy ? 'Recording…' : `Collected — paid ${rupees(fp.due)}`}
      </button>
    </div>
  )
}

function Party({ label, contact }) {
  if (!contact) {
    return <div className="text-xs text-muted">{label} — unknown</div>
  }
  const phone = (contact.phone || '').trim()
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-xs text-muted" style={{ width: 48 }}>{label}</span>
      <span className="font-medium truncate" style={{ flex: 1 }}>{contact.name}</span>
      {phone ? (
        // A tel: link rather than plain text — one click to dial on mobile, and
        // the desktop hand-off still works for anyone using a softphone.
        <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs"
           style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}>
          <Phone size={13} /> {phone}
        </a>
      ) : (
        <span className="text-xs text-muted">no number</span>
      )}
    </div>
  )
}

/**
 * Who is carrying this order.
 *
 * Only shown for orders that are actually going somewhere. A self-collect order
 * has no delivery leg, and an order still waiting on the farm has nothing to
 * carry yet — a dropdown on either is a question with no useful answer.
 *
 * Assigning is what gives a delivery account any access to the order at all:
 * `party_for` on the server reads this field, and an account not named here has
 * no standing on the row. So this control is not a convenience, it is the
 * permission grant.
 */
function AssignDelivery({ order, partners, onChanged }) {
  const [busy, setBusy] = useState(false)

  // Nothing to deliver: the customer is collecting it themselves.
  if (order.purchase_mode === 'pickup') return null
  // Nothing to carry yet, or nothing left to carry.
  if (['pending', 'admin_review', 'accepted', 'rejected', 'chat_active',
       'completed', 'cancelled'].includes(order.status)) return null

  const assign = async (value) => {
    setBusy(true)
    try {
      await adminAPI.assignDelivery(
        order.order_type, order.id, value === '' ? null : Number(value))
      toast.success(value === '' ? 'Unassigned' : 'Assigned')
      onChanged()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not assign that')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
      <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Delivery</span>
      <select
        className="form-input"
        style={{ maxWidth: 240, padding: '6px 10px', fontSize: 13 }}
        value={order.assigned_delivery_id ?? ''}
        disabled={busy}
        onChange={(e) => assign(e.target.value)}
      >
        <option value="">Unassigned</option>
        {partners.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name}{p.active_orders ? ` · ${p.active_orders} in hand` : ''}
          </option>
        ))}
      </select>
      {partners.length === 0 && (
        <span className="text-xs text-muted">
          No delivery partners yet — add one under Delivery.
        </span>
      )}
    </div>
  )
}
