import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Calendar, Check, MapPin, Package, PauseCircle, Phone,
  PlayCircle, Repeat, Tractor, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI, familyPackSubscriptionsAPI, toList } from '../../api'

/**
 * Every weekly basket on the platform — and the screen where they are approved.
 *
 * Baskets are built by customers from the whole catalogue and sold by F2H, so
 * approving one is F2H committing to source it every week. That makes this an
 * action screen rather than a monitor: the pending queue is work, and a basket
 * left in it is a customer waiting.
 *
 * The supplier breakdown is the reason approval is possible at all. Nothing
 * else in the data model records who grows what is in a basket, so without it
 * an admin can see the items and has no idea who to ring.
 */

const STATUS_BADGE = {
  pending: 'badge-warning',
  active: 'badge-success',
  paused: 'badge-info',
  cancelled: 'badge-gray',
}

const FILTERS = [
  { key: 'pending', label: 'To approve' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: '', label: 'All' },
]

const rupees = (n) => `₹${Number(n || 0).toFixed(2)}`

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * Which farms supply this basket, and what to buy from each.
 *
 * Grouped by farm rather than listed by item, because a sourcing round is
 * organised by who you drive to, not by vegetable. This is the only place the
 * link between a basket and its growers exists — F2H sells the basket, so
 * nothing in the order itself records where the produce came from.
 */
function Suppliers({ suppliers }) {
  if (!suppliers?.length) return null
  return (
    <div style={{ marginTop: 12 }}>
      <div
        className="text-xs font-bold text-muted"
        style={{ letterSpacing: '0.04em', marginBottom: 6 }}
      >
        SOURCE FROM {suppliers.length} FARM{suppliers.length === 1 ? '' : 'S'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suppliers.map(f => (
          <div
            key={f.farmer_id}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--color-gray-50)',
            }}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="flex items-center gap-2 text-sm">
                <Tractor size={13} className="text-muted" />
                <span className="font-semibold text-dark">{f.farm_name || `Farm #${f.farmer_id}`}</span>
                {f.phone && (
                  <a href={`tel:${f.phone}`} className="flex items-center gap-1 text-primary text-xs">
                    <Phone size={11} /> {f.phone}
                  </a>
                )}
              </span>
              <span className="text-sm font-bold">{rupees(f.subtotal)}</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 3 }}>
              {f.items.map(i => `${i.name} ${i.quantity}${i.unit}`).join(' · ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const daysSince = (iso) => {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function AdminBaskets() {
  const [subs, setSubs] = useState([])
  const [counts, setCounts] = useState({})
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.familyPackSubscriptions(status ? { status } : {})
      setSubs(toList(data))
      // `counts` is every status regardless of the current filter, so the tab
      // numbers stay put when you filter.
      setCounts(data?.counts || {})
    } catch {
      toast.error('Failed to load weekly baskets')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  const setStatusOn = async (id, next, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id)
    try {
      await familyPackSubscriptionsAPI.setStatus(id, { status: next })
      toast.success({
        active: 'Basket approved — deliveries will be generated weekly',
        paused: 'Basket paused',
        cancelled: 'Basket cancelled',
      }[next] || 'Updated')
      await fetchSubs()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update this basket')
    } finally {
      setBusyId(null)
    }
  }

  const stalePending = subs.filter(
    s => s.status === 'pending' && (daysSince(s.created_at) ?? 0) >= 2,
  ).length

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 20 }}>
        <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
          <Repeat size={12} /> RECURRING
        </span>
        <h1 className="text-h2">Weekly Baskets</h1>
        <p className="text-sm text-muted">
          Customers build these from the whole catalogue and F2H sells them. Approving one
          commits us to sourcing it every week.
        </p>
      </div>

      {stalePending > 0 && (
        <div
          className="card flex items-start gap-3"
          style={{
            padding: 16, marginBottom: 20, borderRadius: 'var(--radius-lg)',
            // Accent, not warning: the palette defines --color-warning as a
            // single value with no 50/200 steps, so a tinted panel has to come
            // from the accent ramp. Same treatment the farmer's pending-basket
            // notice uses.
            background: 'var(--color-accent-50)',
            borderColor: 'var(--color-accent-200)',
          }}
        >
          <AlertTriangle size={18} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} />
          <div className="text-sm">
            <strong>{stalePending}</strong> basket{stalePending === 1 ? ' has' : 's have'} been waiting
            two days or more for approval. Those customers have no groceries coming.
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setStatus(f.key)}
            className={`btn btn-sm ${status === f.key ? 'btn-primary font-bold' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            {f.label}
            {f.key && counts[f.key] != null && (
              <span style={{ marginLeft: 6, opacity: 0.75 }}>{counts[f.key]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      ) : subs.length === 0 ? (
        <div className="card" style={{ padding: 48, borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
          <Package size={40} className="text-muted" style={{ margin: '0 auto 14px' }} />
          <h2 className="text-h3" style={{ marginBottom: 6 }}>
            {status ? `No ${status} baskets` : 'No weekly baskets yet'}
          </h2>
          <p className="text-sm text-muted">
            Customers build these from a farm&rsquo;s products and pick a delivery day.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {subs.map(s => {
            const waiting = s.status === 'pending' ? daysSince(s.created_at) : null
            return (
              <div key={s.id} className="card" style={{ padding: 20, borderRadius: 'var(--radius-xl)' }}>
                <div className="flex items-start justify-between flex-wrap gap-4" style={{ marginBottom: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
                      <span className="font-bold text-dark">Basket #{s.id}</span>
                      <span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span>
                      {waiting != null && waiting >= 2 && (
                        <span className="badge badge-warning">waiting {waiting}d</span>
                      )}
                    </div>

                    <div className="text-sm text-muted flex items-center gap-2" style={{ marginBottom: 3 }}>
                      <User size={13} />
                      <span className="text-dark font-semibold">{s.customer?.full_name || 'Customer'}</span>
                      {s.customer?.phone && (
                        <a href={`tel:${s.customer.phone}`} className="flex items-center gap-1 text-primary">
                          <Phone size={12} /> {s.customer.phone}
                        </a>
                      )}
                    </div>

                    <div className="text-sm text-muted flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> Every {s.weekday_name}
                      </span>
                      <span>{s.deliveries_count} delivered</span>
                      <span>created {fmtDate(s.created_at)}</span>
                    </div>

                    {s.delivery_address && (
                      <div className="text-sm text-muted flex items-center gap-1" style={{ marginTop: 3 }}>
                        <MapPin size={13} />
                        {[s.delivery_address.address_line1, s.delivery_address.city,
                          s.delivery_address.postal_code].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="text-xs text-muted">Weekly value</div>
                    <div className="text-h4 font-extrabold">
                      &#8377;{Number(s.weekly_total || 0).toFixed(2)}
                    </div>
                    {s.status === 'active' && s.next_delivery_date && (
                      <div className="text-xs text-primary font-bold">
                        next {fmtDate(s.next_delivery_date)}
                      </div>
                    )}
                    {s.coupon && (
                      <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                        {s.coupon.code} {s.coupon.applied ? '(used)' : '(first basket)'}
                      </div>
                    )}
                  </div>
                </div>

                {s.customer_message && (
                  <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                    &ldquo;{s.customer_message}&rdquo;
                  </p>
                )}

                <Suppliers suppliers={s.suppliers} />

                <div
                  className="flex gap-2 flex-wrap"
                  style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-gray-100)' }}
                >
                  {s.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-success btn-sm font-bold"
                        style={{ borderRadius: 'var(--radius-full)' }}
                        disabled={busyId === s.id}
                        onClick={() => setStatusOn(
                          s.id, 'active',
                          `Approve this basket?\n\nF2H will source ${rupees(s.weekly_total)} of produce ` +
                          `every ${s.weekday_name} and deliver it until the customer pauses or cancels.`,
                        )}
                      >
                        <Check size={14} /> Approve basket
                      </button>
                      <button
                        className="btn btn-error btn-sm"
                        style={{ borderRadius: 'var(--radius-full)' }}
                        disabled={busyId === s.id}
                        onClick={() => setStatusOn(
                          s.id, 'cancelled',
                          'Decline this basket? The customer will be told it is cancelled.',
                        )}
                      >
                        <X size={14} /> Decline
                      </button>
                    </>
                  )}
                  {s.status === 'active' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: 'var(--radius-full)' }}
                      disabled={busyId === s.id}
                      onClick={() => setStatusOn(s.id, 'paused')}
                    >
                      <PauseCircle size={14} /> Pause
                    </button>
                  )}
                  {s.status === 'paused' && (
                    <button
                      className="btn btn-primary btn-sm font-bold"
                      style={{ borderRadius: 'var(--radius-full)' }}
                      disabled={busyId === s.id}
                      onClick={() => setStatusOn(s.id, 'active')}
                    >
                      <PlayCircle size={14} /> Resume
                    </button>
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
