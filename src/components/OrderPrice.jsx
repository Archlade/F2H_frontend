import { Tag } from 'lucide-react'

/**
 * An order's payable total, with the coupon shown when one was applied.
 *
 * `total_price` is always the amount payable, so an order without a coupon
 * renders exactly as it did before. Only a discounted order grows the extra
 * line — otherwise every list would carry a redundant "you saved ₹0".
 *
 * Orders placed before coupons existed have no `subtotal`; the API falls back
 * to the total for those, so the strikethrough never shows a wrong number.
 */
export default function OrderPrice({ order, size = 'md', align = 'left' }) {
  const discount = Number(order?.discount_amount || 0)
  const total = Number(order?.total_price || 0)
  const subtotal = Number(order?.subtotal ?? total)
  const hasDiscount = discount > 0

  const fontSize = size === 'lg' ? '1.25rem' : size === 'sm' ? '0.9375rem' : '1.0625rem'

  return (
    <div style={{ textAlign: align }}>
      <div style={{ fontWeight: 800, fontSize, color: 'var(--color-gray-900)' }}>
        ₹{total.toFixed(2)}
      </div>
      {hasDiscount && (
        <div
          className="flex items-center gap-1 text-xs"
          style={{
            marginTop: 2,
            color: 'var(--color-primary-700)',
            justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <Tag size={11} />
          <span style={{ textDecoration: 'line-through', color: 'var(--color-gray-400)' }}>
            ₹{subtotal.toFixed(2)}
          </span>
          <span style={{ fontWeight: 600 }}>
            {order.coupon?.code ? `${order.coupon.code} −` : 'Saved '}₹{discount.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
