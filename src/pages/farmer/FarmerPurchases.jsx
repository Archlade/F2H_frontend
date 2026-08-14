import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, Loader, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { familyPackOrdersAPI, toList } from '../../api'
import OrderPrice from '../../components/OrderPrice'
import CustomerRequests from '../customer/CustomerRequests'

/**
 * What this farmer has bought from other farms.
 *
 * Deliberately separate from /farmer/requests and /farmer/orders, which show
 * what they are *selling*. The two carry opposite actions — a seller accepts,
 * rejects and marks ready, a buyer can only cancel — so mixing them into one
 * list invites acting on the wrong row. The server enforces the same split:
 * see `party_for` in the backend.
 */
export default function FarmerPurchases() {
  const [tab, setTab] = useState('products')

  return (
    <div className="p-6">
      <div className="section-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={22} /> My Purchases
          </h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            Produce you have bought from other farms. Your own sales live under
            Requests and Orders.
          </p>
        </div>
        <Link to="/products" className="btn btn-primary">
          <Store size={16} /> Browse produce
        </Link>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {[
          { key: 'products', label: 'Product orders' },
          { key: 'packs', label: 'Family packs' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 font-medium ${
              tab === key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' ? (
        // Reuses the customer screen with side=buying, so the two stay in step.
        <div style={{ margin: '-24px' }}>
          <CustomerRequests side="buying" title="Product purchases" />
        </div>
      ) : (
        <PackPurchases />
      )}
    </div>
  )
}

function PackPurchases() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await familyPackOrdersAPI.list({ side: 'buying' })
        if (!cancelled) setOrders(toList(res.data))
      } catch {
        if (!cancelled) toast.error('Failed to load pack purchases')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <Loader className="animate-spin" size={28} />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"><Package size={28} /></div>
        <h3>No basket deliveries yet</h3>
        <p>Weekly basket deliveries you order for your own household appear here.</p>
        <Link to="/weekly-basket" className="btn btn-primary" style={{ marginTop: 8 }}>
          Set up a weekly basket
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders.map((order) => (
        <div key={order.id} className="card">
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{order.pack?.name || `Pack order #${order.id}`}</div>
              <div className="text-sm text-muted">
                {order.farmer?.farmer_profile?.farm_name
                  || [order.farmer?.first_name, order.farmer?.last_name].filter(Boolean).join(' ')
                  || 'Farm'}
                {' · '}
                <span className="capitalize">{String(order.status || '').replace(/_/g, ' ')}</span>
              </div>
            </div>
            <OrderPrice order={order} />
          </div>
        </div>
      ))}
    </div>
  )
}
