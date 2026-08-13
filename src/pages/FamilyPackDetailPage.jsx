import { useState, useEffect } from 'react'
import { mediaUrl } from '../utils/image'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Truck, BadgeCheck, AlertCircle, CheckCircle, ShoppingBag, Leaf, ShieldCheck } from 'lucide-react'
import { familyPacksAPI, familyPackOrdersAPI, locationsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import CouponField, { OrderTotals } from '../components/CouponField'
import toast from 'react-hot-toast'

export default function FamilyPackDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [pack, setPack] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordering, setOrdering] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)

  const [orderForm, setOrderForm] = useState({
    delivery_address_id: '',
    delivery_notes: '',
    customer_message: '',
  })
  const [coupon, setCoupon] = useState(null)

  useEffect(() => {
    const fetchPack = async () => {
      setLoading(true)
      try {
        const res = await familyPacksAPI.get(id)
        setPack(res.data)

        if (isAuthenticated) {
          const addrRes = await locationsAPI.getAddresses()
          setAddresses(addrRes.data || [])
        }
      } catch {
        toast.error('Failed to load family pack detail')
        navigate('/family-packs')
      } finally {
        setLoading(false)
      }
    }
    fetchPack()
  }, [id, isAuthenticated])

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/auth?mode=login'); return }
    // Farmers order packs from each other; only their own is refused.
    if (user.role === 'admin') { toast.error('Admin accounts cannot place orders'); return }
    if (pack?.farmer_id === user.id) { toast.error('This is your own Family Pack'); return }

    if (!orderForm.delivery_address_id) {
      toast.error('Please select a delivery address')
      return
    }

    setOrdering(true)
    try {
      await familyPackOrdersAPI.create({
        pack_id: Number(id),
        delivery_address_id: orderForm.delivery_address_id,
        delivery_notes: orderForm.delivery_notes,
        customer_message: orderForm.customer_message,
        coupon_code: coupon?.code || undefined,
      })
      toast.success('Family Pack order placed! The farmer will review and confirm.')
      setShowOrderModal(false)
      navigate('/dashboard/family-pack-orders')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit Family Pack order')
    } finally {
      setOrdering(false)
    }
  }

  if (loading) {
    return (
      <div className="container section-sm">
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-2xl)' }} />
      </div>
    )
  }

  if (!pack) return null

  return (
    <div className="container section-sm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted" style={{ marginBottom: 24 }}>
        <Link to="/family-packs" className="flex items-center gap-1 text-muted" style={{ transition: 'color 0.2s' }}>
          <ArrowLeft size={14} /> Family Packs
        </Link>
        <span>/</span>
        <span className="text-dark font-semibold truncate">{pack.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Banner Image Visual */}
        <div className="lg:col-span-6">
          <div style={{ borderRadius: 'var(--radius-2xl)', overflow: 'hidden', height: 420, background: 'var(--color-gray-100)', position: 'relative', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-gray-200)' }}>
            {pack.banner_image ? (
              <img src={mediaUrl(pack.banner_image)} alt={pack.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={90} color="var(--color-gray-300)" />
              </div>
            )}
            <div style={{ position: 'absolute', top: 16, left: 16 }}>
              <span className="badge badge-success flex items-center gap-1" style={{ fontSize: '0.8125rem', padding: '6px 14px', background: '#10b981', color: 'white', fontWeight: 700 }}>
                <Leaf size={14} /> WEEKLY GROCERY BUNDLE
              </span>
            </div>
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <span className="badge badge-info flex items-center gap-1" style={{ fontSize: '0.8125rem', padding: '6px 14px', background: 'rgba(14, 165, 233, 0.95)', color: 'white' }}>
                <Truck size={14} /> Doorstep Delivery
              </span>
            </div>
          </div>
        </div>

        {/* Details & Action Panel */}
        <div className="lg:col-span-6" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {pack.farmer && (
            <div className="flex items-center gap-2 text-sm text-muted">
              {pack.farmer.avatar_url ? (
                <img src={mediaUrl(pack.farmer.avatar_url)} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                  {pack.farmer.farm_name?.[0]}
                </div>
              )}
              <span>Farmer: <strong className="text-dark">{pack.farmer.farm_name}</strong></span>
              {pack.farmer.is_verified && <BadgeCheck size={16} color="var(--color-primary-600)" />}
            </div>
          )}

          <h1 className="text-h2" style={{ letterSpacing: '-0.03em' }}>{pack.name}</h1>

          <div style={{ padding: '24px', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span className="text-xs font-bold text-primary uppercase">WEEKLY ESTIMATE</span>
              <div style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
                ₹{pack.price.toFixed(2)}
              </div>
            </div>
            <span className="badge badge-success flex items-center gap-1" style={{ padding: '8px 14px', fontSize: '0.8125rem' }}>
              <ShieldCheck size={16} /> Best Value Guarantee
            </span>
          </div>

          <p className="text-body text-muted" style={{ lineHeight: 1.7 }}>
            {pack.description || 'Fresh produce bundle carefully curated for your family routine.'}
          </p>

          {/* Items breakdown list */}
          <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-xl)', padding: '24px', background: 'white' }}>
            <h3 className="text-h4" style={{ marginBottom: 16 }}>Products Included This Week</h3>
            {pack.items && pack.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pack.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between" style={{ padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-150)' }}>
                    <div className="flex items-center gap-3">
                      {item.product?.primary_image ? (
                        <img src={mediaUrl(item.product.primary_image)} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag size={20} color="var(--color-gray-400)" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-dark text-sm">{item.product?.name || 'Product'}</div>
                        <div className="text-xs text-muted">₹{item.product?.price || 0} / {item.unit}</div>
                      </div>
                    </div>
                    <span className="badge badge-success font-extrabold" style={{ padding: '6px 12px' }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No item list specified.</p>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg touch-target w-full font-bold"
            style={{ borderRadius: 'var(--radius-full)', padding: '16px 32px' }}
            onClick={() => {
              if (!isAuthenticated) { navigate('/auth?mode=login'); return }
              setShowOrderModal(true)
            }}
          >
            Order Family Pack Now
          </button>
        </div>
      </div>

      {/* Doorstep Delivery Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowOrderModal(false)}>
          <div className="modal modal-bottom-sheet" style={{ maxWidth: 540, borderRadius: 'var(--radius-2xl)' }}>
            <div className="modal-header">
              <h3 className="text-h4">Order Family Pack</h3>
              <button className="btn btn-ghost btn-icon touch-target" onClick={() => setShowOrderModal(false)}>✕</button>
            </div>

            <form onSubmit={handleOrderSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ padding: '14px 16px', background: 'var(--color-info-50)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Truck size={20} color="var(--color-info-600)" />
                  <span className="text-sm text-info">
                    Family Packs are delivered straight to your home every week. Pickup is not applicable.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Delivery Address *</label>
                  {addresses.length === 0 ? (
                    <div style={{ padding: 16, background: 'var(--color-accent-50)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 10, itemsCenter: 'center' }}>
                      <AlertCircle size={16} color="var(--color-accent-600)" />
                      <span className="text-sm">
                        No saved addresses. <Link to="/dashboard/addresses" style={{ color: 'var(--color-primary-600)' }}>Add address</Link>
                      </span>
                    </div>
                  ) : (
                    <select
                      className="form-select"
                      value={orderForm.delivery_address_id}
                      onChange={(e) => setOrderForm(f => ({ ...f, delivery_address_id: e.target.value }))}
                      required
                    >
                      <option value="">Choose address...</option>
                      {addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.label ? `${a.label} — ` : ''}{a.address_line1}, {a.city}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Notes (optional)</label>
                  <input
                    className="form-input"
                    placeholder="Gate code, landmark, or timing preferences..."
                    value={orderForm.delivery_notes}
                    onChange={(e) => setOrderForm(f => ({ ...f, delivery_notes: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Note for Farmer (optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Any special notes for the farmer..."
                    value={orderForm.customer_message}
                    onChange={(e) => setOrderForm(f => ({ ...f, customer_message: e.target.value }))}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
                  <CouponField subtotal={pack.price} onChange={setCoupon} />
                </div>

                <OrderTotals
                  subtotal={pack.price}
                  discount={coupon?.discount || 0}
                  note="Delivery included."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary font-bold" disabled={ordering} style={{ borderRadius: 'var(--radius-full)' }}>
                  {ordering ? 'Placing Order...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
