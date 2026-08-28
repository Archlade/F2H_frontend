import { useState, useEffect } from 'react'
import { mediaUrl } from '../utils/image'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, MapPin, Truck, Package, Heart, BadgeCheck,
  ShoppingBag, Minus, Plus, MessageCircle, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, ShoppingCart
} from 'lucide-react'
import { productsAPI, requestsAPI, locationsAPI, reviewsAPI, favoritesAPI } from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import CouponField, { OrderTotals } from '../components/CouponField'
import toast from 'react-hot-toast'
import { useSeo, useJsonLd, absoluteUrl } from '../utils/seo'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [currentImage, setCurrentImage] = useState(0)

  const [requestForm, setRequestForm] = useState({
    quantity: 1,
    purchase_mode: 'delivery',
    delivery_address_id: '',
    delivery_notes: '',
    pickup_notes: '',
    customer_message: '',
  })
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)
  const { addItem } = useCart()
  const [coupon, setCoupon] = useState(null)

  // The page that can rank for "buy <vegetable> online" — it needs the produce
  // name in the title, not the site name. Falls back to a generic line while
  // the fetch is in flight, since a title of "undefined" is what gets indexed
  // if the crawler snapshots too early.
  useSeo(
    product ? `${product.name} — Buy Fresh Online` : 'Fresh Produce',
    product
      ? `Buy ${product.name} online from ${product.farmer?.farm_name || 'a local farm'} at `
        + `₹${(product.effective_price ?? product.price)?.toFixed?.(2)} per ${product.unit}. `
        + 'Farm fresh, delivered to your home with cash on delivery from F2H Market.'
      : 'Fresh produce direct from local farmers, delivered to your home with cash on delivery.',
  )

  /**
   * Product structured data — the highest-value schema on the site.
   *
   * This is what lets Google show the price, the star rating and an in-stock
   * badge inside the search result itself rather than a bare blue link. For
   * "buy <vegetable> online" that is the difference between being listed and
   * being clicked.
   *
   * Everything below is read off the product, never invented. A rating is only
   * declared when reviews actually exist — `aggregateRating` with zero reviews
   * is the single most common reason Google rejects Product markup, and a
   * rejection costs the rest of the block with it.
   */
  useJsonLd('product-schema', product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description
      || `Fresh ${product.name} from ${product.farmer?.farm_name || 'a local farm'}, delivered to your home.`,
    image: (product.images || []).map(i => absoluteUrl(mediaUrl(i.image_url))).filter(Boolean),
    category: product.category?.name,
    brand: {
      '@type': 'Brand',
      name: product.farmer?.farm_name || 'F2H Market',
    },
    offers: {
      '@type': 'Offer',
      url: `https://f2hmarket.com/products/${product.id}`,
      priceCurrency: 'INR',
      price: (product.effective_price ?? product.price)?.toFixed?.(2),
      availability: product.stock_status === 'out_of_stock'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      // Cash on delivery — declared so the result does not imply card checkout.
      acceptedPaymentMethod: {
        '@type': 'PaymentMethod',
        name: 'Cash on Delivery',
      },
      seller: { '@type': 'Organization', name: 'F2H Market' },
    },
    ...(product.rating_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating_avg).toFixed(1),
        reviewCount: product.rating_count,
      },
    } : {}),
  } : null)

  // Breadcrumbs turn the raw URL under a search result into a readable path —
  // "Products › Vegetables › Tomatoes" instead of f2hmarket.com/products/41.
  useJsonLd('breadcrumb-schema', product ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://f2hmarket.com/' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: 'https://f2hmarket.com/products' },
      ...(product.category?.name
        ? [{ '@type': 'ListItem', position: 3, name: product.category.name }]
        : []),
      {
        '@type': 'ListItem',
        position: product.category?.name ? 4 : 3,
        name: product.name,
        item: `https://f2hmarket.com/products/${product.id}`,
      },
    ],
  } : null)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [prodRes, revRes] = await Promise.all([
          productsAPI.get(id),
          reviewsAPI.list({ product_id: id }),
        ])
        setProduct(prodRes.data)
        setReviews(revRes.data.items || [])
        setRequestForm((f) => ({ ...f, quantity: Number(prodRes.data.min_quantity) }))

        if (isAuthenticated) {
          const [addrRes, favRes] = await Promise.all([
            locationsAPI.getAddresses(),
            favoritesAPI.check({ product_id: id }),
          ])
          setAddresses(addrRes.data || [])
          setFavorited(favRes.data.favorited)
        }
      } catch {
        toast.error('Failed to load product')
        navigate('/products')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id, isAuthenticated])

  const handleFavorite = async () => {
    if (!isAuthenticated) { toast.error('Sign in to save favorites'); return }
    const { data } = await favoritesAPI.toggleProduct(id)
    setFavorited(data.favorited)
    toast.success(data.favorited ? 'Added to favorites' : 'Removed from favorites')
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { navigate('/auth?mode=login'); return }
    // Farmers buy from each other and admins may buy too, so the only case
    // refused here is your own listing — which the server refuses as well,
    // because selling to yourself inflates your own sales figures.
    if (product?.farmer_id === user.id) { toast.error('This is your own listing'); return }

    if (requestForm.purchase_mode === 'delivery' && !requestForm.delivery_address_id) {
      toast.error('Please select a delivery address')
      return
    }

    setRequesting(true)
    try {
      await requestsAPI.create({
        product_id: Number(id),
        quantity: requestForm.quantity,
        purchase_mode: requestForm.purchase_mode,
        delivery_address_id: requestForm.delivery_address_id || undefined,
        delivery_notes: requestForm.delivery_notes,
        pickup_notes: requestForm.pickup_notes,
        customer_message: requestForm.customer_message,
        // Only the code travels: the server recomputes the discount from its
        // own prices, so a tampered total can't buy anything cheaply.
        coupon_code: coupon?.code || undefined,
      })
      toast.success('Purchase request sent! The farmer will respond soon.')
      setShowRequestForm(false)
      navigate('/dashboard/requests')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="container section-sm">
        <div className="product-detail-grid">
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-2xl)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[20, 14, 14, 28, 14, 14].map((h, i) => (
              <div key={i} className="skeleton" style={{ height: h, borderRadius: 8, width: i === 0 ? '70%' : '100%' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!product) return null

  const hasDiscount = product.discount && product.effective_price < product.price
  const discountPct = hasDiscount ? Math.round((1 - product.effective_price / product.price) * 100) : 0
  // Pre-discount; the coupon comes off in OrderTotals below.
  const subtotal = product.effective_price * requestForm.quantity

  return (
    <div className="container section-sm product-detail-page">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted" style={{ marginBottom: 24 }}>
        <Link to="/products" className="flex items-center gap-1 text-muted" style={{ transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary-600)'}
          onMouseLeave={(e) => e.currentTarget.style.color = ''}>
          <ArrowLeft size={14} /> Products
        </Link>
        <span>/</span>
        <span>{product.category?.name}</span>
        <span>/</span>
        <span className="text-dark truncate">{product.name}</span>
      </div>

      <div className="product-detail-grid">
        {/* Images */}
        <div>
          {/* Main image */}
          <div style={{ position: 'relative', borderRadius: 'var(--radius-2xl)', overflow: 'hidden', marginBottom: 12, aspectRatio: '1', background: 'var(--color-gray-100)' }}>
            {product.images?.length > 0 ? (
              <>
                {/*
                  The photo is shown whole, over a blurred copy of itself.

                  This frame is square and a phone photo is not, so `cover` —
                  which is what this was — filled it by cropping the difference
                  away. On the page where somebody decides whether to buy, the
                  produce is the one thing that must not be trimmed to fit.

                  The backdrop is scaled past the edges before blurring: a blur
                  samples beyond the element's box, where there is nothing, so
                  an unscaled copy fades out at the sides and leaves a pale
                  halo. Overshooting moves that fade out of view.

                  aria-hidden and an empty alt, because it is the same picture
                  twice — a screen reader announcing it a second time as
                  decoration would be noise.
                */}
                <img
                  src={mediaUrl(product.images[currentImage]?.image_url)}
                  alt=""
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', filter: 'blur(24px)', transform: 'scale(1.15)',
                  }}
                />
                {/* Knocks the blur back so it reads as a surface rather than a
                    second, competing photograph. */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.18)' }} />
                <img
                  src={mediaUrl(product.images[currentImage]?.image_url)}
                  alt={product.name}
                  style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={60} color="var(--color-gray-300)" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <div className="flex gap-2 scroll-x-touch" style={{ paddingBottom: 4 }}>
              {product.images.map((img, i) => (
                <button key={img.id} onClick={() => setCurrentImage(i)} style={{
                  width: 72, height: 72, flexShrink: 0, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  border: `2px solid ${i === currentImage ? 'var(--color-primary-500)' : 'transparent'}`,
                  cursor: 'pointer', padding: 0, background: 'none',
                }}>
                  {/* Named, not empty. A cover photo beside a heading is
                      decorative and correctly takes alt="", but a product photo
                      is content — it is what Google Images indexes, and for
                      produce that is a real way people arrive. */}
                  <img
                    src={mediaUrl(img.image_url)}
                    alt={`${product.name} from ${product.farmer?.farm_name || 'a local farm'}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Category + tags */}
          <div className="flex gap-2 flex-wrap">
            <span className="badge badge-info">{product.category?.name}</span>
            {product.is_organic && <span className="badge badge-success">Organic</span>}
            {product.is_natural && <span className="badge badge-success">Natural</span>}
            {product.is_homemade && <span className="badge badge-success">Home made</span>}
            {product.is_farm_grown && <span className="badge badge-gray">Farm Grown</span>}
            {hasDiscount && <span className="badge badge-error">-{discountPct}% OFF</span>}
          </div>

          <div>
            <h1 className="text-h2" style={{ marginBottom: 8 }}>{product.name}</h1>
            {/* Farmer */}
            {product.farmer && (
              <Link to={`/farmers/${product.farmer_id}`}
                className="flex items-center gap-2 text-muted"
                style={{ fontSize: '0.9375rem', width: 'fit-content' }}
              >
                {product.farmer.is_verified && <BadgeCheck size={15} color="var(--color-primary-600)" />}
                <span>{product.farmer.farm_name}</span>
              </Link>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={16}
                  fill={s <= Math.round(product.rating_avg) ? 'var(--color-accent-400)' : 'none'}
                  color="var(--color-accent-400)" />
              ))}
            </div>
            <span className="text-sm font-semibold">{Number(product.rating_avg).toFixed(1)}</span>
            <span className="text-sm text-muted">({product.rating_count} reviews)</span>
          </div>

          {/* Price */}
          <div style={{ padding: '20px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-xl)' }}>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span style={{ fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 900, color: 'var(--color-gray-900)', letterSpacing: '-0.04em' }}>
                ₹{product.effective_price?.toFixed(2)}
              </span>
              <span className="text-muted">per {product.unit}</span>
              {hasDiscount && (
                <span style={{ textDecoration: 'line-through', color: 'var(--color-gray-400)', fontSize: '1.125rem' }}>
                  ₹{product.price?.toFixed(2)}
                </span>
              )}
            </div>
            {hasDiscount && (
              <p className="text-sm" style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: 4 }}>
                You save ₹{(product.price - product.effective_price).toFixed(2)} ({discountPct}% off)
              </p>
            )}
          </div>

          {/* Availability */}
          <div className="flex gap-3 flex-wrap">
            <span className={`badge ${product.stock_status === 'in_stock' ? 'badge-success' : product.stock_status === 'low_stock' ? 'badge-warning' : 'badge-error'}`}>
              {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </span>
            {product.delivery_available && (
              <span className="badge badge-info flex items-center gap-1"><Truck size={11} /> Delivery</span>
            )}
            {product.pickup_available && (
              <span className="badge badge-gray flex items-center gap-1"><Package size={11} /> Pickup</span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-body text-muted" style={{ lineHeight: 1.7 }}>{product.description}</p>
          )}

          {/* Favorite + Request (Desktop / Tablet view) */}
          <div className="flex gap-3 product-detail-actions-desktop">
            <button
              className="btn btn-secondary btn-icon touch-target"
              onClick={handleFavorite}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={18} fill={favorited ? 'var(--color-error)' : 'none'} color={favorited ? 'var(--color-error)' : 'currentColor'} />
            </button>
            <button
              className="btn btn-primary btn-lg w-full touch-target"
              onClick={() => {
                if (!isAuthenticated) { navigate('/auth?mode=login'); return }
                setShowRequestForm(true)
              }}
              disabled={product.stock_status === 'out_of_stock'}
            >
              {product.stock_status === 'out_of_stock' ? 'Out of Stock' : 'Request to Buy'}
            </button>

            {/* Buying several things is the common case, and one order per
                product means a separate form each time. The cart is the way
                round that; "Request to Buy" stays for the single-item case. */}
            <button
              className="btn btn-secondary btn-lg"
              style={{ marginTop: 10, width: '100%' }}
              disabled={product.stock_status === 'out_of_stock' || addingToCart}
              onClick={async () => {
                if (!isAuthenticated) { navigate('/auth?mode=login'); return }
                setAddingToCart(true)
                try {
                  // The quantity the customer actually chose.
                  //
                  // This sent `product.min_quantity` regardless — so the
                  // stepper directly above this button did nothing for the cart
                  // path. Set 5kg, add to cart, get 0.5kg, and nothing on
                  // screen said why.
                  const qty = Number(requestForm.quantity) || Number(product.min_quantity) || 1
                  await addItem(product.id, qty)
                  toast.success(`Added ${qty} ${product.unit} to cart`)
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Could not add to cart')
                } finally {
                  setAddingToCart(false)
                }
              }}
            >
              <ShoppingCart size={16} /> {addingToCart ? 'Adding…' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile Devices */}
      <div className="product-detail-sticky-bar">
        <div>
          <div className="text-xs text-muted">Price</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>
            ₹{product.effective_price?.toFixed(2)}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>/{product.unit}</span>
          </div>
        </div>
        <div className="flex gap-2" style={{ flex: 1, maxWidth: 220 }}>
          <button
            className="btn btn-secondary btn-icon touch-target"
            onClick={handleFavorite}
            aria-label="Favorite"
          >
            <Heart size={18} fill={favorited ? 'var(--color-error)' : 'none'} color={favorited ? 'var(--color-error)' : 'currentColor'} />
          </button>
          <button
            className="btn btn-primary w-full touch-target"
            onClick={() => {
              if (!isAuthenticated) { navigate('/auth?mode=login'); return }
              setShowRequestForm(true)
            }}
            disabled={product.stock_status === 'out_of_stock'}
          >
            Request
          </button>
        </div>
      </div>

      {/* Request Form Modal (Bottom Sheet on Mobile) */}
      {showRequestForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRequestForm(false)}>
          <div className="modal modal-bottom-sheet" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="text-h4">Purchase Request</h3>
              <button className="btn btn-ghost btn-icon touch-target" onClick={() => setShowRequestForm(false)} aria-label="Close">✕</button>
            </div>
            <form onSubmit={handleRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Product summary */}
                <div style={{ padding: '12px 16px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  {product.primary_image && <img src={mediaUrl(product.primary_image)} alt={product.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10 }} />}
                  <div>
                    <div className="font-semibold">{product.name}</div>
                    <div className="text-sm text-muted">₹{product.effective_price?.toFixed(2)} per {product.unit}</div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="form-group">
                  <label className="form-label">Quantity ({product.unit})</label>
                  <div className="flex items-center gap-3">
                    <button type="button" className="btn btn-secondary btn-icon touch-target"
                      onClick={() => setRequestForm((f) => ({ ...f, quantity: Math.max(Number(product.min_quantity), f.quantity - 0.5) }))}>
                      <Minus size={16} />
                    </button>
                    <input className="form-input" type="number"
                      min={product.min_quantity} max={product.available_quantity} step="0.5"
                      value={requestForm.quantity}
                      onChange={(e) => setRequestForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                      style={{ textAlign: 'center', maxWidth: 100 }}
                    />
                    <button type="button" className="btn btn-secondary btn-icon touch-target"
                      onClick={() => setRequestForm((f) => ({ ...f, quantity: Math.min(Number(product.available_quantity), f.quantity + 0.5) }))}>
                      <Plus size={16} />
                    </button>
                    <span className="text-sm text-muted">
                      Max: {product.available_quantity} {product.unit}
                    </span>
                  </div>
                </div>

                {/* Purchase mode */}
                <div className="form-group">
                  <label className="form-label">Purchase Mode</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'delivery', label: 'Delivery', icon: Truck, enabled: product.delivery_available },
                      { value: 'pickup', label: 'Farm Pickup', icon: Package, enabled: product.pickup_available },
                    ].map(({ value, label, icon: Icon, enabled }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={!enabled}
                        onClick={() => setRequestForm((f) => ({ ...f, purchase_mode: value }))}
                        className="btn flex-1 touch-target"
                        style={{
                          border: `2px solid ${requestForm.purchase_mode === value ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                          background: requestForm.purchase_mode === value ? 'var(--color-primary-50)' : 'white',
                          color: requestForm.purchase_mode === value ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                          opacity: enabled ? 1 : 0.4,
                          flexDirection: 'column', gap: 4, padding: '14px',
                        }}
                      >
                        <Icon size={20} />
                        <span className="text-sm">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery address */}
                {requestForm.purchase_mode === 'delivery' && (
                  <div className="form-group">
                    <label className="form-label">Delivery Address</label>
                    {addresses.length === 0 ? (
                      <div style={{ padding: 16, background: 'var(--color-accent-50)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <AlertCircle size={16} color="var(--color-accent-600)" />
                        <span className="text-sm">
                          No saved addresses. <Link to="/dashboard/addresses" style={{ color: 'var(--color-primary-600)' }}>Add one</Link>
                        </span>
                      </div>
                    ) : (
                      <select className="form-select" value={requestForm.delivery_address_id}
                        onChange={(e) => setRequestForm((f) => ({ ...f, delivery_address_id: e.target.value }))}
                        required>
                        <option value="">Select address...</option>
                        {addresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.label ? `${addr.label} — ` : ''}{addr.address_line1}, {addr.city}
                          </option>
                        ))}
                      </select>
                    )}
                    <input className="form-input" placeholder="Delivery notes (optional)" style={{ marginTop: 8 }}
                      value={requestForm.delivery_notes}
                      onChange={(e) => setRequestForm((f) => ({ ...f, delivery_notes: e.target.value }))} />
                  </div>
                )}

                {requestForm.purchase_mode === 'pickup' && (
                  <div className="form-group">
                    <label className="form-label">Pickup Notes</label>
                    <input className="form-input" placeholder="Any pickup preferences..."
                      value={requestForm.pickup_notes}
                      onChange={(e) => setRequestForm((f) => ({ ...f, pickup_notes: e.target.value }))} />
                  </div>
                )}

                {/* Message */}
                <div className="form-group">
                  <label className="form-label">Message to Farmer (optional)</label>
                  <textarea className="form-textarea" placeholder="Introduce yourself or add any special requests..." rows={3}
                    value={requestForm.customer_message}
                    onChange={(e) => setRequestForm((f) => ({ ...f, customer_message: e.target.value }))}
                    style={{ minHeight: 80 }}
                  />
                </div>

                {/* Coupon — re-checks itself when the quantity changes, since
                    both the discount and any minimum-spend rule depend on the
                    subtotal. */}
                <div style={{ borderTop: '1px solid var(--color-gray-100)', paddingTop: 12 }}>
                  <CouponField subtotal={subtotal} onChange={setCoupon} />
                </div>

                {/* Summary */}
                <div className="text-sm text-muted">
                  {requestForm.quantity} {product.unit} × ₹{product.effective_price?.toFixed(2)}
                </div>
                <OrderTotals
                  subtotal={subtotal}
                  discount={coupon?.discount || 0}
                  note="The farmer confirms the final amount before dispatch."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary touch-target" onClick={() => setShowRequestForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary touch-target" disabled={requesting}>
                  {requesting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviews */}
      <div style={{ marginTop: 64, borderTop: '1px solid var(--color-gray-100)', paddingTop: 48 }}>
        <h2 className="text-h3" style={{ marginBottom: 24 }}>Customer Reviews ({product.rating_count})</h2>
        {reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ padding: '20px 24px', background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-gray-100)', boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                  <div className="avatar-placeholder avatar-sm" style={{ fontSize: '0.75rem' }}>
                    {r.reviewer?.full_name?.[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-dark">{r.reviewer?.full_name}</div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={13} fill={s <= r.rating ? 'var(--color-accent-400)' : 'none'} color="var(--color-accent-400)" />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                {r.title && <div className="font-semibold" style={{ marginBottom: 4 }}>{r.title}</div>}
                <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{r.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 0' }}>
            <div className="empty-state__icon"><Star size={24} /></div>
            <p>No reviews yet. Be the first to review!</p>
          </div>
        )}
      </div>
    </div>
  )
}
