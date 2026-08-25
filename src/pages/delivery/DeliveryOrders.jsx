import { useCallback, useEffect, useState } from 'react'
import { Bike, ExternalLink, Loader, LogOut, MapPin, Package, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

import { requestsAPI, familyPackOrdersAPI, toList } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * The whole of the website for a delivery account.
 *
 * Not a page inside the customer site — the only page. A delivery account
 * cannot buy anything, has no cart and no orders of its own, and can read
 * customers' addresses; dropping it on the marketplace is at best confusing.
 * `homeFor()` sends it here and every other route refuses it.
 *
 * Deliberately one screen with no navigation. The job is a list of stops and
 * two buttons per stop; anything else is a thing to get lost in on a phone at
 * the side of a road.
 *
 * The two order types are fetched separately because they live in different
 * tables behind different endpoints, and merged here. Both come back through
 * `for_courier` on the server, so each carries the customer's phone and the
 * amount to collect — and neither carries what any farmer is paid.
 */

const money = (n) => `₹${Number(n || 0).toFixed(2)}`

/** What this order is waiting for, and what pressing the button will do. */
function nextStep(status) {
  if (status === 'picked_up') {
    return { label: 'Start delivery', to: 'out_for_delivery',
             hint: 'Loaded and leaving the store room' }
  }
  if (status === 'out_for_delivery') {
    return { label: 'Delivered & cash collected', to: 'completed',
             hint: 'Only after the customer has paid' }
  }
  return null
}

export default function DeliveryOrders() {
  usePrivatePageSeo('My deliveries')
  const { user, logout } = useAuth()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Settled rather than awaited together: if baskets fail, the ordinary
      // orders are still a usable round. Half a list beats a spinner.
      const [reqs, packs] = await Promise.allSettled([
        requestsAPI.list({ per_page: 50 }),
        familyPackOrdersAPI.list({ per_page: 50 }),
      ])

      const rows = []
      if (reqs.status === 'fulfilled') {
        rows.push(...toList(reqs.value.data).map((o) => ({ ...o, kind: 'request' })))
      }
      if (packs.status === 'fulfilled') {
        rows.push(...toList(packs.value.data).map((o) => ({ ...o, kind: 'basket' })))
      }
      if (reqs.status === 'rejected' && packs.status === 'rejected') {
        toast.error('Could not load your deliveries')
      }

      // Oldest first — the one waiting longest is the one to do next, which is
      // the opposite of every other list in this app.
      rows.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      setOrders(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const advance = async (order, to) => {
    setBusyId(`${order.kind}-${order.id}`)
    try {
      const api = order.kind === 'request' ? requestsAPI : familyPackOrdersAPI
      await api.updateStatus(order.id, { status: to })
      toast.success(to === 'completed' ? 'Delivered — cash recorded' : 'On your way')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update that order')
    } finally {
      setBusyId(null)
    }
  }

  const outstanding = orders
    .filter((o) => o.status === 'out_for_delivery')
    .reduce((sum, o) => sum + Number(o.amount_to_collect || 0), 0)

  return (
    <div className="section-sm" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="flex items-start justify-between flex-wrap gap-3" style={{ marginBottom: 18 }}>
        <div>
          <div className="flex items-center gap-2">
            <Bike size={20} />
            <h1 className="text-h2">My deliveries</h1>
          </div>
          <p className="text-sm text-muted">
            {user?.full_name ? `${user.full_name} · ` : ''}
            {loading ? 'Loading…' : `${orders.length} to do`}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
          <LogOut size={15} /> Sign out
        </button>
      </div>

      {/* Only meaningful once something is actually out — before that nobody is
          carrying money and the figure would just be zero. */}
      {outstanding > 0 && (
        <div className="card" style={{
          padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 16,
          background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)',
        }}>
          <div className="text-xs text-muted">To collect on this round</div>
          <div className="text-h4" style={{ color: 'var(--color-primary-700)' }}>
            {money(outstanding)}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center p-12" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <Package size={44} style={{ margin: '0 auto 12px', color: 'var(--color-gray-400)' }} />
          <h3 className="text-h4" style={{ marginBottom: 4 }}>Nothing assigned</h3>
          <p className="text-sm text-muted">
            Orders appear here once an admin assigns them to you.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => {
            const step = nextStep(o.status)
            const key = `${o.kind}-${o.id}`
            const address = o.delivery_address
            return (
              <div key={key} className="card" style={{ padding: 16, borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-bold text-dark">
                      {o.product?.name || o.pack?.name || `Order #${o.id}`}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {o.kind === 'request' ? 'Order' : 'Basket'} #{o.id}
                      {o.quantity ? ` · ${o.quantity} ${o.product?.unit || ''}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-xs text-muted">Collect</div>
                    <div className="text-h4">{money(o.amount_to_collect ?? o.total_price)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="text-sm">
                    <span className="text-muted">To </span>
                    <span className="font-bold text-dark">{o.customer?.full_name || 'Customer'}</span>
                  </div>

                  {o.customer?.phone && (
                    <a href={`tel:${o.customer.phone}`} className="flex items-center gap-2 text-sm"
                       style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}>
                      <Phone size={15} /> {o.customer.phone}
                    </a>
                  )}

                  {address && (
                    <a
                      className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}
                      target="_blank" rel="noopener noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        [address.address_line1, address.address_line2, address.city, address.pincode]
                          .filter(Boolean).join(', ')
                      )}`}
                    >
                      <MapPin size={15} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>
                        {[address.address_line1, address.address_line2, address.city, address.pincode]
                          .filter(Boolean).join(', ')}
                        {' '}<ExternalLink size={11} style={{ display: 'inline' }} />
                      </span>
                    </a>
                  )}

                  {o.delivery_notes && (
                    <div className="text-xs text-muted">Note: {o.delivery_notes}</div>
                  )}
                </div>

                <div style={{ marginTop: 14 }}>
                  {step ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary touch-target"
                        style={{ width: '100%' }}
                        disabled={busyId === key}
                        onClick={() => advance(o, step.to)}
                      >
                        {busyId === key ? 'Saving…' : step.label}
                      </button>
                      <div className="text-xs text-muted" style={{ marginTop: 6, textAlign: 'center' }}>
                        {step.hint}
                      </div>
                    </>
                  ) : (
                    // Assigned, but the store room has not released it yet.
                    // Shown rather than hidden so the driver knows it is coming
                    // and does not go looking for it.
                    <div className="text-sm text-muted" style={{ textAlign: 'center' }}>
                      Waiting on the store room · {o.status?.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
