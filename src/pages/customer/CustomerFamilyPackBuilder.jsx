import { useState, useEffect } from 'react'
import { mediaUrl } from '../../utils/image'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Search, Plus, Minus, Trash2, Calendar, MapPin, Package,
  CheckCircle, ArrowLeft, Loader,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  productsAPI, locationsAPI, familyPackSubscriptionsAPI, toList,
} from '../../api'
import CouponField from '../../components/CouponField'
import { useAuth } from '../../context/AuthContext'
import { basketPaths } from '../../utils/basketPaths'

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday']

/**
 * Baskets are delivered at the weekend. 5 = Saturday, 6 = Sunday, matching
 * `DELIVERY_WEEKDAYS` in backend/app/services/family_pack_subscription_service.py
 * — the server rejects anything else, so offering a Tuesday here would only
 * produce a button that fails on save.
 *
 * Two days rather than seven is what makes the buying plan workable: produce
 * for a Saturday round is bought on Friday in one trip, where seven scattered
 * weekdays is seven trips for the same volume.
 */
const WEEKDAYS = [
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
]

/**
 * The days to show, including this basket's own if it predates the rule.
 *
 * Baskets created when any weekday was allowed keep their day until the
 * customer moves it. Without this the picker would render with nothing
 * selected, and the first tap would silently reschedule a delivery they never
 * asked to change.
 */
function weekdayOptions(current) {
  if (current == null || WEEKDAYS.some(d => d.value === current)) return WEEKDAYS
  return [...WEEKDAYS, { value: current, label: `${WEEKDAY_NAMES[current]} (current)` }]
}

/**
 * Build (or edit) a weekly basket: anything in the catalogue, a delivery day
 * and an address. Everything after that happens automatically.
 *
 * There is no farm to choose. A basket used to belong to one farm — you picked
 * a farm first and could only add its products — which made the weekly shop a
 * standing order with a single grower. Now F2H sources the items and sells the
 * basket, so a household can have tomatoes from whoever has good tomatoes.
 */
export default function CustomerFamilyPackBuilder() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Mounted under both /dashboard and /farmer — farmers order baskets too, and
  // their basket sits on a different path because /farmer/family-pack-orders
  // was already the supply side. basketPaths is the single place that knows.
  const paths = basketPaths(user?.role)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coupon, setCoupon] = useState(null)
  const [products, setProducts] = useState([])
  const [addresses, setAddresses] = useState([])
  const [search, setSearch] = useState('')

  const [basket, setBasket] = useState({})       // product_id -> quantity
  const [weekday, setWeekday] = useState(5)
  const [addressId, setAddressId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // The weekly basket catalogue — the products an admin has said F2H can
        // source every week. Not the whole shop: a basket is a standing
        // commitment, so it is deliberately a shorter list than what you can
        // buy as a one-off. The server enforces the same rule on save.
        //
        // Fetched once; a basket is a browsing exercise and refetching per
        // keystroke would be worse than filtering a list this size in the client.
        const [prodRes, addrRes] = await Promise.all([
          productsAPI.list({ per_page: 200, basket_eligible: true }),
          locationsAPI.getAddresses(),
        ])
        setProducts(toList(prodRes.data))
        const addr = toList(addrRes.data)
        setAddresses(addr)
        setAddressId(addr.find(a => a.is_default)?.id || addr[0]?.id || '')

        if (isEdit) {
          const { data } = await familyPackSubscriptionsAPI.get(id)
          setWeekday(data.delivery_weekday)
          setAddressId(data.delivery_address_id || '')
          setNotes(data.delivery_notes || '')
          setBasket(Object.fromEntries((data.items || []).map(i => [i.product_id, i.quantity])))
        } else {
          // One basket per customer — the server refuses a second with "You
          // already have a weekly basket". It only says so on save, so without
          // this you pick products, choose a day, set an address, press the
          // button and *then* find out none of it could ever have worked.
          // Caught on arrival instead, and sent to the basket that does exist.
          const mine = toList((await familyPackSubscriptionsAPI.list()).data)
            .find(s => ['pending', 'active', 'paused'].includes(s.status))
          if (mine) {
            toast('You already have a weekly basket — opening it to edit.')
            navigate(basketPaths(user?.role).edit(mine.id), { replace: true })
            return
          }
        }
      } catch {
        toast.error('Failed to load the basket builder')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  /**
   * Set a product's weekly quantity, honouring the farmer's minimum.
   *
   * Anything below the minimum removes the item rather than ordering less than
   * the farmer is willing to pick. Previously this only rejected `qty <= 0`, so
   * a basket could sit at half a kilo against a two-kilo minimum — and a weekly
   * basket repeats that every week. The server enforces the same rule in
   * `_validated_items`; this keeps the UI from offering something it will
   * refuse.
   */
  const setQty = (productId, qty, minQty = 0) => {
    setBasket(prev => {
      const next = { ...prev }
      if (qty <= 0 || qty < minQty) delete next[productId]
      else next[productId] = Number(qty.toFixed(2))
      return next
    })
  }

  const chosen = products.filter(p => basket[p.id] > 0)
  const weeklyTotal = chosen.reduce(
    (sum, p) => sum + (p.effective_price ?? p.price) * basket[p.id], 0
  )
  // Farm name is searchable too — "everything from Green Acres" is a real way
  // people shop, even when the basket is no longer tied to one farm.
  const visible = products.filter(p => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q)
      || (p.farmer?.farm_name || '').toLowerCase().includes(q)
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!chosen.length) return toast.error('Add at least one product to your basket')
    if (!addressId) return toast.error('Choose a delivery address')

    const payload = {
      delivery_weekday: Number(weekday),
      delivery_address_id: Number(addressId),
      delivery_notes: notes,
      items: chosen.map(p => ({ product_id: p.id, quantity: basket[p.id] })),
      // Only on creation: editing an existing basket can't take a coupon,
      // because the code was already redeemed at signup and single use means
      // there is nothing left to apply.
      ...(isEdit || !coupon ? {} : { coupon_code: coupon.code }),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await familyPackSubscriptionsAPI.update(id, payload)
        toast.success('Weekly basket updated')
      } else {
        await familyPackSubscriptionsAPI.create(payload)
        toast.success('Basket submitted — we’ll confirm it shortly')
      }
      navigate(paths.list)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save your basket')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="section-sm"><div className="skeleton" style={{ height: 360, borderRadius: 16 }} /></div>

  return (
    <div className="section-sm">
      <Link to={paths.list} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <ArrowLeft size={15} /> Back
      </Link>

      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
          <Calendar size={12} /> WEEKLY ROUTINE
        </span>
        <h1 className="text-h2">{isEdit ? 'Edit your weekly basket' : 'Build your weekly basket'}</h1>
        <p className="text-sm text-muted">
          Pick your products once. They arrive on the same day every week until you pause.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: products ── */}
        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 14 }}>
              <h3 className="text-h4">1 · Add products</h3>
              {products.length > 0 && (
                <div className="flex items-center gap-2">
                  <Search size={15} className="text-muted" />
                  <input
                    className="form-input"
                    style={{ maxWidth: 200 }}
                    placeholder="Filter products"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-muted">
                {search.trim()
                  ? `Nothing matches “${search.trim()}”.`
                  : products.length === 0
                    // An empty catalogue is the starting state, not a failure —
                    // say so, rather than implying the page is broken.
                    ? 'No products are available for weekly baskets yet. Please check back soon.'
                    : 'No products available right now.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visible.map(p => {
                  const qty = basket[p.id] || 0
                  const price = p.effective_price ?? p.price
                  return (
                    <div key={p.id} className="fp-product-card">
                      {p.primary_image ? (
                        <img src={mediaUrl(p.primary_image)} alt="" className="fp-product-card__img" />
                      ) : (
                        <div className="fp-product-card__img flex items-center justify-center text-muted">
                          <Package size={26} />
                        </div>
                      )}

                      <div className="fp-product-card__info">
                        <div className="font-bold text-dark text-body">{p.name}</div>
                        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                          ₹{price.toFixed(2)} / {p.unit} · {p.available_quantity} {p.unit} in stock
                        </div>
                        {/* Which farm it comes from. Worth showing now that a
                            basket mixes them — it is the difference between a
                            list of vegetables and a list of vegetables from
                            people. */}
                        {p.farmer?.farm_name && (
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                            {p.farmer.farm_name}
                          </div>
                        )}
                      </div>

                      <div className="fp-product-card__qty-pill">
                        {/* Stepping below the minimum drops the item; adding
                            starts at the minimum rather than at 1. */}
                        <button type="button" className="fp-product-card__qty-btn"
                                onClick={() => setQty(p.id, qty - 1, Number(p.min_quantity || 0))}
                                disabled={qty <= 0}>
                          <Minus size={14} />
                        </button>
                        <span>{qty} {p.unit}</span>
                        <button type="button" className="fp-product-card__qty-btn"
                                onClick={() => setQty(
                                  p.id,
                                  qty === 0 ? Number(p.min_quantity || 1) : qty + 1,
                                  Number(p.min_quantity || 0),
                                )}>
                          <Plus size={14} />
                        </button>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: 82 }}>
                        <div className="text-xs text-muted">Per week</div>
                        <div className="font-extrabold text-dark">₹{(price * qty).toFixed(2)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: schedule + summary ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-xl)' }}>
            <h3 className="text-h4" style={{ marginBottom: 14 }}>2 · Delivery day</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {weekdayOptions(weekday).map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setWeekday(d.value)}
                  className={`btn btn-sm ${weekday === d.value ? 'btn-primary font-bold' : 'btn-secondary'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <small className="text-muted" style={{ display: 'block', marginTop: 8 }}>
              Baskets are delivered at the weekend.
            </small>

            <div style={{ marginTop: 18 }}>
              <label className="form-label flex items-center gap-1">
                <MapPin size={14} /> Delivery address
              </label>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted">
                  No saved addresses.{' '}
                  <Link to={paths.addresses} style={{ color: 'var(--color-primary-600)' }}>
                    Add one first
                  </Link>
                </p>
              ) : (
                <select className="form-select w-full" value={addressId}
                        onChange={e => setAddressId(e.target.value)} required>
                  {addresses.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.label || a.address_line1}, {a.city}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="form-label">Notes for the farmer</label>
              <textarea className="form-input w-full" rows="2" value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Leave at the gate, ring the bell…" />
            </div>
          </div>

          <div className="card" style={{
            padding: 24, borderRadius: 'var(--radius-xl)',
            background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)',
          }}>
            <div className="text-xs font-extrabold text-primary uppercase" style={{ marginBottom: 8 }}>
              Weekly total
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
              ₹{weeklyTotal.toFixed(2)}
              <span className="text-xs font-normal text-muted"> / week</span>
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>
              {chosen.length} product{chosen.length === 1 ? '' : 's'} · every{' '}
              {/* `WEEKDAY_NAMES`, not `WEEKDAYS` — the latter is now the two
                  selectable days, so indexing it by weekday number would read
                  past the end and throw. */}
              {WEEKDAY_NAMES[weekday]}
            </div>

            {/* The code is single use, so only the first delivery is
                discounted — the weekly figure above stays full price. */}
            {coupon && (
              <div className="text-xs" style={{ marginTop: 6, color: 'var(--color-primary-700)', fontWeight: 600 }}>
                First basket ₹{Math.max(weeklyTotal - coupon.discount, 0).toFixed(2)}
              </div>
            )}

            {chosen.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chosen.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name} × {basket[p.id]} {p.unit}</span>
                    <button type="button" onClick={() => setQty(p.id, 0)}
                            className="btn btn-ghost btn-sm" title="Remove">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isEdit && chosen.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-primary-200)' }}>
                <CouponField subtotal={weeklyTotal} onChange={setCoupon} recurringNote />
              </div>
            )}

            <button type="submit" disabled={saving}
                    className="btn btn-primary btn-lg w-full font-bold"
                    style={{ marginTop: 18, borderRadius: 'var(--radius-full)' }}>
              {saving ? <Loader size={16} className="animate-spin" />
                      : <><CheckCircle size={16} /> {isEdit ? 'Save changes' : 'Start weekly delivery'}</>}
            </button>
            <p className="text-xs text-muted" style={{ marginTop: 10, textAlign: 'center' }}>
              The farm confirms once. After that it repeats every week — pause any time.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}
