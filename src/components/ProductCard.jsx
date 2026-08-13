import { Link, useNavigate } from 'react-router-dom'
import { mediaUrl } from '../utils/image'
import { MapPin, Star, Truck, ShoppingBag, Heart, BadgeCheck, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { favoritesAPI } from '../api'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ProductCard({ product, showDistance = true, compact = false }) {
  const { isAuthenticated, user } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [favorited, setFavorited] = useState(false)
  const [adding, setAdding] = useState(false)

  const soldOut = product.stock_status === 'out_of_stock'
  // Hidden rather than disabled for people who cannot buy at all: an admin, or
  // the farmer looking at their own listing. A permanently dead button on every
  // card is worse than no button.
  const canBuy = user?.role !== 'admin' && product.farmer?.id !== user?.id

  const handleQuickAdd = async (e) => {
    // The whole card is a <Link>. Without both of these, adding to the cart
    // also navigates away from the grid the customer is shopping in.
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) { navigate('/auth?mode=login'); return }

    setAdding(true)
    try {
      await addItem(product.id, Number(product.min_quantity) || 1)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  const handleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast.error('Sign in to save favorites')
      return
    }
    try {
      const { data } = await favoritesAPI.toggleProduct(product.id)
      setFavorited(data.favorited)
      toast.success(data.favorited ? 'Added to favorites' : 'Removed from favorites')
    } catch {
      toast.error('Failed to update favorites')
    }
  }

  const hasDiscount = product.discount && product.effective_price < product.price
  const discountPct = hasDiscount
    ? Math.round((1 - product.effective_price / product.price) * 100)
    : 0

  const stockColor = {
    in_stock: 'badge-success',
    low_stock: 'badge-warning',
    out_of_stock: 'badge-error',
  }[product.stock_status] || 'badge-gray'

  const stockLabel = {
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  }[product.stock_status] || product.stock_status

  return (
    <Link
      to={`/products/${product.id}`}
      className={`product-card ${compact ? 'product-card--compact' : ''}`}
      style={{ textDecoration: 'none' }}
    >
      {/* Image */}
      <div style={{ position: 'relative' }}>
        {product.primary_image ? (
          <img
            src={mediaUrl(product.primary_image)}
            alt={product.name}
            className="product-card__image"
            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div className="product-card__image-placeholder">
            <ShoppingBag size={32} />
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <div className="product-card__discount-badge">
            -{discountPct}%
          </div>
        )}

        {/* Favorite button with touch-friendly dimensions */}
        <button
          onClick={handleFavorite}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className="product-card__favorite-btn"
        >
          <Heart size={16} fill={favorited ? 'var(--color-error)' : 'none'} color={favorited ? 'var(--color-error)' : 'var(--color-gray-600)'} />
        </button>
      </div>

      {/* Body */}
      <div className="product-card__body">
        <div className="product-card__category">
          {product.category?.name}
        </div>
        <div className="product-card__name truncate">{product.name}</div>

        {/* Farmer */}
        {product.farmer && (
          <div className="product-card__farmer flex items-center gap-1 truncate">
            {product.farmer.is_verified && <BadgeCheck size={13} color="var(--color-primary-600)" />}
            <span>{product.farmer.farm_name || product.farmer.full_name}</span>
          </div>
        )}

        {/* Badges */}
        <div className="product-card__badges">
          {product.is_organic && <span className="badge badge-success">Organic</span>}
          {product.delivery_available && (
            <span className="badge badge-info flex items-center gap-1">
              <Truck size={10} /> Delivery
            </span>
          )}
          {product.pickup_available && <span className="badge badge-gray">Pickup</span>}
        </div>

        {/* Price */}
        <div className="product-card__price-row">
          <div>
            <div className="product-card__price">
              ₹{product.effective_price?.toFixed(2)}
              <span className="product-card__unit">
                /{product.unit}
              </span>
            </div>
            {hasDiscount && (
              <div className="product-card__original-price">₹{product.price?.toFixed(2)}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Star size={13} fill="var(--color-accent-400)" color="var(--color-accent-400)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{product.rating_avg?.toFixed(1) || '—'}</span>
          </div>
        </div>

        {/* Quick add.
            The cart had no entry point from the grid at all — the only way in
            was to open a product, add it, go back, open the next. A cart with a
            ₹300 minimum is meant to be filled with several things, and that is
            four navigations per item.

            Adds the product's minimum quantity, which is the smallest orderable
            amount and the sane default for one tap. Anyone wanting more opens
            the product and uses the stepper. */}
        {canBuy && (
          <button
            type="button"
            className="btn btn-primary btn-sm w-full font-bold"
            style={{ borderRadius: 'var(--radius-full)', marginTop: 10 }}
            disabled={soldOut || adding}
            onClick={handleQuickAdd}
          >
            <ShoppingCart size={14} />
            {soldOut ? 'Out of stock' : adding ? 'Adding…' : 'Add to cart'}
          </button>
        )}
      </div>

      {/* Footer */}
      {showDistance && product.distance_km != null && (
        <div className="product-card__footer">
          <div className="product-card__distance">
            <MapPin size={12} />
            {product.distance_km < 1
              ? `${(product.distance_km * 1000).toFixed(0)}m away`
              : `${product.distance_km.toFixed(1)} km away`}
          </div>
          <span className={`badge ${stockColor}`}>{stockLabel}</span>
        </div>
      )}
    </Link>
  )
}
