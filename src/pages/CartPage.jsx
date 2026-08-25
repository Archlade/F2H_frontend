import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Loader, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { locationsAPI, toList } from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { basketPaths } from '../utils/basketPaths'
import { useSeo } from '../utils/seo'

/**
 * The cart, and checking out.
 *
 * Two things this screen has to be honest about, because getting either wrong
 * wastes somebody's trip:
 *
 * * **How far from the ₹300 minimum.** Taken from the server's `short_by`
 *   rather than recomputed here, so the app, the website and the API can never
 *   disagree about the rounding on a figure the customer is being held to.
 * * **Lines that can no longer be ordered.** A cart can sit for days; produce
 *   sells out and minimums change. The server marks each line with a `problem`,
 *   and checkout refuses while any remain — so it is shown here rather than
 *   discovered at the end.
 */
export default function CartPage() {
  useSeo('Your Cart', 'Review your basket of farm-fresh groceries and check out with cash on delivery.')
  const { cart, loading, updateItem, removeItem, checkout } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Farmers buy from each other and the cart is public, so a farmer can reach
  // this page — and their address screen is not the customer one. A hardcoded
  // /dashboard/addresses here sent them to a route the guard bounces them off,
  // with no way to add the address the order needs.
  const paths = basketPaths(user?.role)

  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState('')
  const [mode, setMode] = useState('delivery')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)

  // The server charges no delivery on a pickup order, so the summary must not
  // quote one. `cart.delivery_charge` is always the delivery figure — the API
  // has no idea which mode this page is sitting on — so the choice is applied
  // here and re-decided server-side at checkout, which is the read that counts.
  const delivery = mode === 'pickup' ? 0 : Number(cart.delivery_charge || 0)
  const payable = Number(cart.subtotal || 0) + delivery

  /**
   * Change a line's quantity, and say so when the server refuses.
   *
   * The stepper buttons called `updateItem` bare. `CartContext.wrap` does not
   * catch, so any refusal — below the product's minimum, more than is in stock
   * — became an unhandled rejection: nothing on screen, nothing in the cart,
   * and the customer pressing a button that appears to do nothing.
   */
  const changeQuantity = async (itemId, quantity) => {
    try {
      await updateItem(itemId, quantity)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update that quantity')
    }
  }

  useEffect(() => {
    locationsAPI.getAddresses()
      .then(res => {
        const list = toList(res.data)
        setAddresses(list)
        const preferred = list.find(a => a.is_default) || list[0]
        if (preferred) setAddressId(String(preferred.id))
      })
      .catch(() => {})
  }, [])

  const placeOrder = async () => {
    if (mode === 'delivery' && !addressId) {
      return toast.error('Choose a delivery address first')
    }
    if (!window.confirm(
      `Place ${cart.count} order${cart.count === 1 ? '' : 's'} for ₹${payable.toFixed(2)}?\n\n` +
      'Each farm prepares its own order. Once a farmer confirms, that order ' +
      'cannot be cancelled. Payment is cash on delivery.'
    )) return

    setPlacing(true)
    try {
      const result = await checkout({
        purchase_mode: mode,
        delivery_address_id: mode === 'delivery' ? Number(addressId) : null,
        delivery_notes: notes,
      })
      toast.success(result.message || 'Order placed')
      navigate('/dashboard/requests')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not place your order')
      setPlacing(false)
    }
  }

  if (loading && !cart.count) {
    return <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
  }

  if (!cart.count) {
    return (
      <div className="section-sm text-center" style={{ padding: '64px 20px' }}>
        <ShoppingCart size={48} style={{ margin: '0 auto 16px', color: 'var(--color-gray-400)' }} />
        <h1 className="text-h3" style={{ marginBottom: 6 }}>Your cart is empty</h1>
        <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
          Add some produce and it will show up here.
        </p>
        <Link to="/products" className="btn btn-primary">Browse produce</Link>
      </div>
    )
  }

  return (
    <div className="section-sm" style={{ maxWidth: 860, margin: '0 auto' }}>
      <h1 className="text-h2" style={{ marginBottom: 4 }}>Your cart</h1>
      <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
        {cart.count} item{cart.count === 1 ? '' : 's'} · cash on delivery
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {cart.items.map(item => (
          <div key={item.id} className="card" style={{ padding: 14, borderRadius: 'var(--radius-lg)' }}>
            <div className="flex items-center gap-3 flex-wrap">
              <div style={{ flex: 1, minWidth: 160 }}>
                <div className="font-bold text-dark">{item.product?.name || 'Product'}</div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  ₹{Number(item.product?.price || 0).toFixed(2)} / {item.product?.unit}
                  {item.product?.farmer_name && ` · ${item.product.farmer_name}`}
                </div>
              </div>

              <div className="fp-product-card__qty-pill">
                <button
                  type="button"
                  className="fp-product-card__qty-btn"
                  onClick={() => changeQuantity(item.id, item.quantity - 0.5)}
                  aria-label="Reduce quantity"
                >
                  <Minus size={14} />
                </button>
                <span>{item.quantity} {item.product?.unit}</span>
                <button
                  type="button"
                  className="fp-product-card__qty-btn"
                  onClick={() => changeQuantity(item.id, item.quantity + 0.5)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div style={{ minWidth: 82, textAlign: 'right' }} className="font-extrabold text-dark">
                ₹{Number(item.line_total).toFixed(2)}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeItem(item.id)}
                aria-label="Remove from cart"
              >
                <Trash2 size={15} />
              </button>
            </div>

            {item.problem && (
              <div className="flex items-center gap-2 text-xs" style={{
                marginTop: 10, padding: '6px 10px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-accent-50, #FFFBEB)',
                color: 'var(--color-accent-800, #92400E)', fontWeight: 600,
              }}>
                <AlertTriangle size={13} />
                {item.product?.name} is {item.problem} — update or remove it to continue
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 18, borderRadius: 'var(--radius-lg)' }}>
        {/*
          The breakdown appears only when there is a fee to break down. A
          "Delivery ₹0.00" line on every cart is noise, and it reads as
          something having failed to load rather than as nothing being charged.
        */}
        {delivery > 0 && (
          <>
            <div className="flex items-center justify-between text-sm text-muted" style={{ marginBottom: 4 }}>
              <span>Subtotal</span>
              <span>₹{Number(cart.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted" style={{ marginBottom: 8 }}>
              <span>Delivery</span>
              <span>₹{delivery.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-gray-200)', marginBottom: 8 }} />
          </>
        )}

        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="font-bold">Total</span>
          {/*
            `total` rather than `subtotal`, and computed server-side. The
            website and the app both showing a figure they added up themselves
            is how the two come to disagree by a paisa on the same basket.
            Falls back to the subtotal so a build talking to a server without
            this field shows the produce total rather than ₹0.00.
          */}
          <span className="text-h4">₹{payable.toFixed(2)}</span>
        </div>

        {!cart.meets_minimum && (
          <div className="text-sm" style={{
            padding: '10px 12px', borderRadius: 'var(--radius-md)', marginTop: 8,
            background: 'var(--color-accent-50, #FFFBEB)',
            color: 'var(--color-accent-800, #92400E)', fontWeight: 600,
          }}>
            Minimum order is ₹{Number(cart.minimum_order_value).toFixed(0)}.
            Add ₹{Number(cart.short_by).toFixed(2)} more to check out.
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <label className="form-label">How would you like it?</label>
          <select className="form-input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup from the farm</option>
          </select>
        </div>

        {mode === 'delivery' && (
          <div style={{ marginTop: 12 }}>
            <label className="form-label">Delivery address</label>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted">
                No saved addresses. <Link to={paths.addresses} style={{ fontWeight: 600 }}>Add one</Link> first.
              </p>
            ) : (
              <select className="form-input" value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                {addresses.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.label ? `${a.label} — ` : ''}{a.address_line1}, {a.city} {a.postal_code}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label className="form-label">Notes for the farmer (optional)</label>
          <textarea className="form-input" rows={2} value={notes}
                    onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Said before the button, not after. Each line becomes its own order
            because a farmer accepts, prepares and collects cash for their own
            produce — and a customer who expects one delivery and receives three
            has been surprised by us, not by the farms. */}
        <p className="text-xs text-muted" style={{ marginTop: 14 }}>
          Your cart will be placed as {cart.count} separate order{cart.count === 1 ? '' : 's'},
          one per product, so each farm can prepare and deliver its own.
        </p>

        <button
          className="btn btn-primary btn-lg"
          style={{ marginTop: 12, width: '100%' }}
          disabled={placing || !cart.meets_minimum || cart.has_problems}
          onClick={placeOrder}
        >
          {placing ? 'Placing…' : `Place order · ₹${payable.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
