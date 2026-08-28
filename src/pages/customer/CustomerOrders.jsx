import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { Loader, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestsAPI.list({ status: 'active_orders' })
      .then(res => setOrders(toList(res.data)))
      .catch(err => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  // **Every state the order can be in has to appear on its own line.** The bar
  // locates the current one with `indexOf`, and a missing status comes back -1,
  // which fell through to the 10% floor — so an order sitting at
  // `ready_for_pickup` looked barely started, and `cash_collected` was missing
  // from the delivery line entirely.
  //
  // The two lanes diverge after `ready_for_pickup`: F2H collects a delivery
  // order and carries it the rest of the way, while a farm-pickup order is
  // finished the moment the customer collects it.
  const stagesFor = (mode) => mode === 'pickup'
    ? ['confirmed', 'preparing', 'ready_for_pickup', 'completed']
    : ['confirmed', 'preparing', 'ready_for_pickup', 'picked_up',
       'out_for_delivery', 'cash_collected', 'completed'];

  // What the customer is told is happening. Written from their side: they do not
  // care that F2H pays the farmer at collection, only that somebody has it.
  const STAGE_LABELS = {
    confirmed: 'Confirmed by the farmer',
    preparing: 'Being prepared',
    ready_for_pickup: 'Ready',
    picked_up: 'Collected by F2H',
    out_for_delivery: 'Out for delivery',
    cash_collected: 'Delivered',
    completed: 'Completed',
  };

  return (
    <div className="p-6">
      <div className="section-header mb-6">
        <h1 className="text-2xl font-bold">Active Orders</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <Package className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No active orders</h3>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="card border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{order.product_name}</h3>
                  <p className="text-sm text-gray-500">Order #{order.id} • {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <OrderPrice order={order} align="right" />
                  <span className={`badge status-${order.status} mt-1 inline-block capitalize`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* No button on this side — the customer pays at the door. This
                  only tells them how much to have ready. */}
              <CashOnDelivery order={order} orderType="request" />

              {(() => {
                const stages = stagesFor(order.purchase_mode)
                const idx = stages.indexOf(order.status)
                // A status off this line — cancelled, rejected, or one still
                // waiting on the farmer — gets no bar at all rather than a
                // misleading one. Only orders under way have progress to show.
                if (idx < 0) {
                  return (
                    <div className="mt-6 text-sm text-gray-500">
                      {STAGE_LABELS[order.status] || 'Waiting for the farmer to confirm'}
                    </div>
                  )
                }
                // Width from the real position, not a fixed 25% a step: the two
                // lanes have different lengths, and multiplying by a constant
                // sent a seven-stage order past 100%.
                const pct = Math.round(((idx + 1) / stages.length) * 100)
                return (
                  <div className="mt-6 relative">
                    <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                      <div style={{ width: `${pct}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 px-1">
                      <span>{STAGE_LABELS[order.status]}</span>
                      <span>Step {idx + 1} of {stages.length}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
