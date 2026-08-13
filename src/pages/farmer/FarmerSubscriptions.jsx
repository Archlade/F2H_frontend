import { useState, useEffect } from 'react'
import {
  Calendar, Check, X, PauseCircle, PlayCircle, Package, MapPin, User, Repeat,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { familyPackSubscriptionsAPI, toList } from '../../api'

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'

const STATUS_BADGE = {
  pending: 'badge-warning',
  active: 'badge-success',
  paused: 'badge-info',
  cancelled: 'badge-gray',
}

export default function FarmerSubscriptions() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchSubs() }, [])

  const fetchSubs = async () => {
    setLoading(true)
    try {
      const res = await familyPackSubscriptionsAPI.list()
      setSubs(toList(res.data))
    } catch {
      toast.error('Failed to load weekly baskets')
    } finally {
      setLoading(false)
    }
  }

  const changeStatus = async (id, status) => {
    try {
      const { data } = await familyPackSubscriptionsAPI.setStatus(id, { status })
      setSubs(prev => prev.map(s => (s.id === id ? data : s)))
      const msg = {
        active: 'Weekly basket confirmed — deliveries will be created automatically.',
        paused: 'Weekly basket paused.',
        cancelled: 'Weekly basket cancelled.',
      }
      toast.success(msg[status] || 'Updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update')
    }
  }

  const pending = subs.filter(s => s.status === 'pending')

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
          <Repeat size={12} /> RECURRING
        </span>
        <h1 className="text-h2">Weekly Baskets</h1>
        <p className="text-sm text-muted">
          Standing baskets that include your produce. F2H builds and sells these, so there is
          nothing to accept — your share appears in Pack Orders each week as confirmed work.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="card" style={{
          padding: 16, marginBottom: 24, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-50)', borderColor: 'var(--color-accent-200)',
        }}>
          <strong>{pending.length}</strong> basket{pending.length === 1 ? '' : 's'} waiting on F2H
          to approve. Nothing needed from you.
        </div>
      )}

      {loading ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      ) : subs.length === 0 ? (
        <div className="card" style={{ padding: 48, borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
          <Package size={40} className="text-muted" style={{ margin: '0 auto 14px' }} />
          <h2 className="text-h3" style={{ marginBottom: 6 }}>No weekly baskets yet</h2>
          <p className="text-sm text-muted">
            Customers can build a basket from your products and pick a delivery day.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {subs.map(s => (
            <div key={s.id} className="card" style={{ padding: 20, borderRadius: 'var(--radius-xl)' }}>
              <div className="flex items-start justify-between flex-wrap gap-4" style={{ marginBottom: 14 }}>
                <div>
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <User size={15} className="text-muted" />
                    <span className="font-bold text-dark">{s.customer?.full_name}</span>
                    <span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span>
                  </div>
                  <div className="text-sm text-muted flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> Every {s.weekday_name}
                    </span>
                    {s.delivery_address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={13} /> {s.delivery_address.address_line1}, {s.delivery_address.city}
                      </span>
                    )}
                    <span>{s.deliveries_count} delivered</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="text-xs text-muted">Weekly value</div>
                  <div className="text-h4 font-extrabold">₹{s.weekly_total.toFixed(2)}</div>
                  {s.status === 'active' && (
                    <div className="text-xs text-primary font-bold">next {fmtDate(s.next_delivery_date)}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {(s.items || []).map(item => (
                  <span key={item.id} className="badge badge-gray">
                    {item.product?.name} × {item.quantity} {item.unit}
                  </span>
                ))}
              </div>

              {s.customer_message && (
                <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
                  “{s.customer_message}”
                </p>
              )}

              {/* No accept, decline, pause or resume.
                  A basket is F2H's to approve and the customer's to pause — a
                  farmer pausing it would stop a delivery of other farms' produce
                  too. Legacy single-farm baskets are the exception and keep
                  their confirm button until they are edited across. */}
              {s.status === 'pending' && s.farmer?.id && (
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-success btn-sm font-bold"
                          style={{ borderRadius: 'var(--radius-full)' }}
                          onClick={() => changeStatus(s.id, 'active')}>
                    <Check size={14} /> Confirm weekly basket
                  </button>
                  <button className="btn btn-error btn-sm" style={{ borderRadius: 'var(--radius-full)' }}
                          onClick={() => changeStatus(s.id, 'cancelled')}>
                    <X size={14} /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
