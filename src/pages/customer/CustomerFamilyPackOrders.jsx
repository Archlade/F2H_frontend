import { useState, useEffect } from 'react'
import { mediaUrl } from '../../utils/image'
import { Link } from 'react-router-dom'
import {
  Package, Calendar, MapPin, CheckCircle, PauseCircle, PlayCircle,
  XCircle, Plus, Edit, Clock, Truck, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { familyPackSubscriptionsAPI, familyPackOrdersAPI, toList } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { basketPaths } from '../../utils/basketPaths'
import OrderPrice from '../../components/OrderPrice'
import CashOnDelivery from '../../components/CashOnDelivery'

const STAGES = ['confirmed', 'preparing', 'picked_up', 'out_for_delivery', 'completed']
const STAGE_LABELS = {
  confirmed: 'Scheduled',
  preparing: 'Being packed',
  // Worded for the customer, who does not care that this is also when the
  // farmer is paid — only that their basket has left the farm.
  picked_up: 'Collected from the farm',
  out_for_delivery: 'Out for delivery',
  completed: 'Delivered',
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined,
    { weekday: 'long', day: 'numeric', month: 'short' }) : '—'

const daysUntil = (iso) => {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso) - new Date()) / 86400000)
  if (diff < 0) return 'due now'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return `in ${diff} days`
}

export default function CustomerFamilyPackOrders() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [pauseOpen, setPauseOpen] = useState(false)
  const [pauseWeeks, setPauseWeeks] = useState('1')

  // Farmers buy baskets too, and this screen is mounted under /farmer for them.
  // Every link has to follow, or a farmer editing their basket is bounced off
  // the customer-only route guard.
  const isFarmer = user?.role === 'farmer'
  const paths = basketPaths(user?.role)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [subRes, orderRes] = await Promise.all([
        // `side=buying` is what distinguishes "the basket I ordered" from "the
        // baskets containing my produce". Without it a farmer opening this page
        // sees their supply list and wonders why they cannot edit it.
        familyPackSubscriptionsAPI.list(isFarmer ? { side: 'buying' } : undefined),
        familyPackOrdersAPI.list({ per_page: 50, ...(isFarmer ? { side: 'buying' } : {}) }),
      ])
      setSubscription(toList(subRes.data)[0] || null)
      setDeliveries(toList(orderRes.data))
    } catch {
      toast.error('Failed to load your weekly basket')
    } finally {
      setLoading(false)
    }
  }

  const changeStatus = async (status, extra = {}) => {
    try {
      const { data } = await familyPackSubscriptionsAPI.setStatus(subscription.id, { status, ...extra })
      setSubscription(data)
      const msg = {
        paused: 'Deliveries paused. Resume whenever you like.',
        active: 'Weekly deliveries are back on.',
        cancelled: 'Weekly basket cancelled.',
      }
      toast.success(msg[status] || 'Updated')
      setPauseOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update your basket')
    }
  }

  if (loading) return <div className="section-sm"><div className="skeleton" style={{ height: 320, borderRadius: 16 }} /></div>

  // ── No basket yet ──
  if (!subscription) {
    return (
      <div className="section-sm">
        <div style={{ marginBottom: 24 }}>
          <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
            <Calendar size={12} /> WEEKLY ROUTINE
          </span>
          <h1 className="text-h2">My Weekly Basket</h1>
        </div>
        <div className="card" style={{ padding: 48, borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
          <Package size={40} className="text-muted" style={{ margin: '0 auto 14px' }} />
          <h2 className="text-h3" style={{ marginBottom: 6 }}>No weekly basket yet</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
            Choose your products and a delivery day once — they arrive every week without you lifting a finger.
          </p>
          <Link to={paths.create} className="btn btn-primary btn-lg font-bold"
                style={{ borderRadius: 'var(--radius-full)' }}>
            <Plus size={16} /> Build my weekly basket
          </Link>
        </div>
      </div>
    )
  }

  const { status } = subscription
  const packed = deliveries.filter(d => d.is_recurring)
  const current = packed.find(d => !['completed', 'cancelled'].includes(d.status))
  const stageIndex = current ? STAGES.indexOf(current.status) : -1

  return (
    <div className="section-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 28 }}>
        <div>
          <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
            <Calendar size={12} /> EVERY {subscription.weekday_name?.toUpperCase()}
          </span>
          <h1 className="text-h2">My Weekly Basket</h1>
          <p className="text-sm text-muted">
            From {subscription.farmer?.farm_name || 'your farm'} — delivered to your door every week.
          </p>
        </div>

        <div className="flex gap-2">
          <Link to={paths.edit(subscription.id)} className="btn btn-secondary btn-sm touch-target">
            <Edit size={16} /> Edit basket
          </Link>
          {status === 'active' && (
            <button className="btn btn-secondary btn-sm touch-target" onClick={() => setPauseOpen(true)}>
              <PauseCircle size={16} /> Pause
            </button>
          )}
          {status === 'paused' && (
            <button className="btn btn-primary btn-sm touch-target" onClick={() => changeStatus('active')}>
              <PlayCircle size={16} /> Resume
            </button>
          )}
          {status !== 'cancelled' && (
            <button className="btn btn-ghost btn-sm touch-target"
                    onClick={() => window.confirm('Cancel your weekly basket?') && changeStatus('cancelled')}>
              <XCircle size={16} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Status card ── */}
      {status === 'pending' && (
        <div className="fp-status-card" style={{ marginBottom: 32, background: 'var(--color-accent-50)' }}>
          <span className="badge badge-warning" style={{ marginBottom: 8 }}>WAITING FOR THE FARM</span>
          <h2 className="text-h3">{subscription.farmer?.farm_name} is reviewing your basket</h2>
          <p className="text-sm text-muted">
            Once they confirm, deliveries start every {subscription.weekday_name} automatically.
          </p>
        </div>
      )}

      {status === 'active' && (
        <div className="fp-status-card" style={{ marginBottom: 32 }}>
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                <span className="fp-status-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  YOUR FAMILY PACK IS ACTIVE
                </span>
              </div>
              <h2 className="text-h3" style={{ marginBottom: 4 }}>Your weekly groceries are on schedule.</h2>
              <p className="text-sm text-muted">
                {packed.length} deliver{packed.length === 1 ? 'y' : 'ies'} so far from{' '}
                {subscription.farmer?.farm_name}.
              </p>
            </div>

            <div style={{
              background: 'var(--color-primary-50)', padding: '16px 24px',
              borderRadius: 'var(--radius-xl)', textAlign: 'right',
            }}>
              <div className="text-xs font-semibold text-muted">NEXT DELIVERY</div>
              <div className="text-h4 font-extrabold" style={{ color: 'var(--color-primary-800)' }}>
                {fmtDate(subscription.next_delivery_date)}
              </div>
              <div className="text-xs text-primary font-bold" style={{ marginTop: 2 }}>
                {daysUntil(subscription.next_delivery_date)}
              </div>
            </div>
          </div>

          {current && (
            <div className="fp-timeline">
              <div className="fp-timeline__progress"
                   style={{ width: `${Math.max(0, stageIndex) / (STAGES.length - 1) * 100}%` }} />
              {STAGES.map((s, i) => (
                <div key={s} className={`fp-timeline__step ${i < stageIndex ? 'completed' : i === stageIndex ? 'active' : ''}`}>
                  <div className="fp-timeline__node">
                    {i < stageIndex ? <CheckCircle size={18} /> : i + 1}
                  </div>
                  <div className="fp-timeline__label">{STAGE_LABELS[s]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status === 'paused' && (
        <div className="fp-status-card paused" style={{ marginBottom: 32, background: 'var(--color-accent-50)' }}>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <span className="badge badge-warning" style={{ marginBottom: 8 }}>PAUSED</span>
              <h2 className="text-h3">Your Family Pack is taking a break</h2>
              <p className="text-sm text-muted">
                {subscription.paused_until
                  ? <>Deliveries resume automatically on <strong>{fmtDate(subscription.paused_until)}</strong>.</>
                  : 'Deliveries are paused until you resume them. Your basket is saved.'}
              </p>
            </div>
            <button className="btn btn-accent btn-lg touch-target" onClick={() => changeStatus('active')}>
              <PlayCircle size={18} /> Resume now
            </button>
          </div>
        </div>
      )}

      {/* ── Summary tiles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: 36 }}>
        <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <div className="fp-insight-icon"><Calendar size={22} /></div>
            <div>
              <div className="text-xs font-semibold text-muted">DELIVERY DAY</div>
              <div className="font-extrabold text-h4">Every {subscription.weekday_name}</div>
            </div>
          </div>
          <div className="text-xs text-muted">Recurring weekly dispatch</div>
        </div>

        <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <div className="fp-insight-icon"><MapPin size={22} /></div>
            <div>
              <div className="text-xs font-semibold text-muted">DELIVERY ADDRESS</div>
              <div className="font-extrabold text-body truncate">
                {subscription.delivery_address?.label || subscription.delivery_address?.address_line1 || 'Not set'}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted truncate">
            {subscription.delivery_address?.city} · Doorstep delivery
          </div>
        </div>

        <div className="card" style={{
          padding: 24, borderRadius: 'var(--radius-xl)',
          background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)',
        }}>
          <div className="text-xs font-extrabold text-primary uppercase" style={{ marginBottom: 8 }}>
            WEEKLY TOTAL
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
            ₹{subscription.weekly_total.toFixed(2)}
            <span className="text-xs font-normal text-muted"> / week</span>
          </div>
          <div className="text-xs text-muted flex items-center gap-1" style={{ marginTop: 4 }}>
            <Info size={13} /> Priced at the farm’s current rates
          </div>
        </div>
      </div>

      {/* ── Basket contents ── */}
      <div style={{ marginBottom: 36 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <h3 className="text-h4">In your weekly basket</h3>
          <Link to={paths.edit(subscription.id)} className="btn btn-ghost btn-sm text-primary font-bold">
            + Add or remove products
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(subscription.items || []).map(item => (
            <div key={item.id} className="fp-product-card">
              {item.product?.primary_image ? (
                <img src={mediaUrl(item.product.primary_image)} alt="" className="fp-product-card__img" />
              ) : (
                <div className="fp-product-card__img flex items-center justify-center text-muted">
                  <Package size={28} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-bold text-dark text-body">{item.product?.name}</div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  ₹{item.product?.price.toFixed(2)} / {item.unit}
                </div>
              </div>
              <div className="fp-product-card__qty-pill"><span>{item.quantity} {item.unit}</span></div>
              <div style={{ textAlign: 'right', minWidth: 80 }}>
                <div className="text-xs text-muted">Weekly subtotal</div>
                <div className="font-extrabold text-dark">₹{item.line_total.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delivery history ── */}
      <div>
        <h3 className="text-h4" style={{ marginBottom: 16 }}>Delivery history</h3>
        {packed.length === 0 ? (
          <p className="text-sm text-muted">
            No deliveries yet — the first one is scheduled for {fmtDate(subscription.next_delivery_date)}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {packed.map(d => (
              <div key={d.id} className="card"
                   style={{ padding: 16, borderRadius: 'var(--radius-lg)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="fp-insight-icon">
                      {d.status === 'completed' ? <CheckCircle size={18} />
                        : d.status === 'out_for_delivery' ? <Truck size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <div className="font-bold text-dark">{fmtDate(d.delivery_date)}</div>
                      <div className="text-xs text-muted">{(d.pack?.items || []).length} products</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`badge ${d.status === 'completed' ? 'badge-success' : 'badge-info'}`}>
                      {STAGE_LABELS[d.status] || d.status.replace(/_/g, ' ')}
                    </span>
                    <OrderPrice order={d} align="right" />
                  </div>
                </div>
                {/* Each week's basket is paid in cash at the door, so the amount
                    to have ready belongs on the delivery, not the subscription. */}
                <CashOnDelivery order={d} orderType="pack-order" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pause modal ── */}
      {pauseOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPauseOpen(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal__header">
              <h3 className="text-h4">Pause deliveries</h3>
              <button className="btn btn-ghost btn-icon touch-target" onClick={() => setPauseOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <label className="form-label">Pause for</label>
              <select className="form-select w-full" value={pauseWeeks} onChange={e => setPauseWeeks(e.target.value)}>
                <option value="1">1 week</option>
                <option value="2">2 weeks</option>
                <option value="4">4 weeks</option>
                <option value="0">Until I resume manually</option>
              </select>
              <p className="text-xs text-muted" style={{ marginTop: 10 }}>
                Your basket is saved. Nothing is charged or dispatched while paused.
              </p>
              <button className="btn btn-primary w-full font-bold" style={{ marginTop: 16 }}
                      onClick={() => changeStatus('paused', { weeks: Number(pauseWeeks) })}>
                Pause deliveries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
