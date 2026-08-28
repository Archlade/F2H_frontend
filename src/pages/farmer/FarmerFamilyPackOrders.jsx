import { useState, useEffect } from 'react'
import { familyPackOrdersAPI } from '../../api'
import { Package, Truck, Check, X, MessageCircle, MapPin, Calendar, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';

export default function FarmerFamilyPackOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await familyPackOrdersAPI.list()
      setOrders(res.data.items || [])
    } catch {
      toast.error('Failed to load basket deliveries')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await familyPackOrdersAPI.updateStatus(orderId, { status: newStatus })
      toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Status update failed')
    }
  }

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-info flex items-center gap-1" style={{ marginBottom: 6 }}>
          <Truck size={12} /> DOORSTEP ORDERS
        </span>
        <h1 className="text-h2">Basket Deliveries</h1>
        <p className="text-sm text-muted">Each week&rsquo;s delivery for the standing baskets your farm supplies.</p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 250, borderRadius: 20 }} />
      ) : orders.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', padding: '60px 0', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)' }}>
          <div className="empty-state__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <Package size={32} />
          </div>
          <h3 className="text-h4">No basket deliveries yet</h3>
          <p className="text-muted">Weekly deliveries for baskets that include your produce will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)', background: 'white' }}>
              <div className="flex justify-between items-start flex-wrap gap-4" style={{ marginBottom: 16 }}>
                <div>
                  <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                    <span className="font-extrabold text-sm text-primary">#FPO-{o.id}</span>
                    <span className="badge badge-info">Doorstep Delivery</span>
                    <span className="badge badge-success">{o.status.replace('_', ' ')}</span>
                  </div>
                  <h3 className="text-h4">{o.pack?.name}</h3>
                  <div className="text-sm text-dark font-semibold" style={{ marginTop: 2 }}>
                    Customer: {o.customer?.full_name}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="text-xs text-muted">Order Total</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
                    <OrderPrice order={o} align="right" />
                  </div>
                </div>
              </div>

              {o.delivery_address && (
                <div style={{ background: 'var(--color-gray-50)', padding: 14, borderRadius: 'var(--radius-lg)', marginBottom: 16, display: 'flex', itemsCenter: 'center', gap: 8 }}>
                  <MapPin size={16} color="var(--color-primary-600)" />
                  <div className="text-xs text-dark font-semibold">
                    Delivery Address: {o.delivery_address.address_line1}, {o.delivery_address.city}
                  </div>
                </div>
              )}

              <CashOnDelivery
                order={o}
                orderType="pack-order"
                canCollect
                onCollected={fetchOrders}
              />

              <div className="flex justify-end gap-2 flex-wrap" style={{ paddingTop: 14, borderTop: '1px solid var(--color-gray-100)' }}>
                {o.status === 'pending' && (
                  <>
                    <button className="btn btn-success btn-sm font-bold" onClick={() => handleStatusChange(o.id, 'confirmed')} style={{ borderRadius: 'var(--radius-full)' }}>
                      <Check size={14} /> Accept Order
                    </button>
                    <button className="btn btn-error btn-sm" onClick={() => handleStatusChange(o.id, 'rejected')} style={{ borderRadius: 'var(--radius-full)' }}>
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                {o.status === 'chat_active' && (
                  <button className="btn btn-primary btn-sm font-bold" onClick={() => handleStatusChange(o.id, 'confirmed')} style={{ borderRadius: 'var(--radius-full)' }}>
                    Confirm & Schedule Order
                  </button>
                )}
                {o.status === 'confirmed' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(o.id, 'preparing')} style={{ borderRadius: 'var(--radius-full)' }}>
                    Start Preparing Pack
                  </button>
                )}
                {/* No "send out for delivery" button any more. F2H collects the
                    pack from the farm and pays the farmer their share in cash at
                    that moment, so the transition belongs to whoever hands the
                    money over — the server refuses it from a farmer. */}
                {o.status === 'preparing' && (
                  <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    <Truck size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                    Ready for F2H to collect — you&rsquo;ll be paid in cash at pickup
                  </span>
                )}
                {o.status === 'picked_up' && (
                  <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Collected by F2H — payment recorded
                  </span>
                )}
                {o.status === 'out_for_delivery' && (
                  <button className="btn btn-success btn-sm font-bold" onClick={() => handleStatusChange(o.id, 'completed')} style={{ borderRadius: 'var(--radius-full)' }}>
                    <CheckCircle size={14} /> Mark Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
