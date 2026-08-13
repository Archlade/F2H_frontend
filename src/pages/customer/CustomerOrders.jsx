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

  // The delivery path. `ready_for_pickup` is the customer-collects variant and
  // is not a stage on this line — an order takes one branch or the other.
  const orderStatuses = ['confirmed', 'preparing', 'picked_up', 'out_for_delivery', 'completed'];

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

              <div className="mt-6 relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div style={{ width: `${Math.max(10, orderStatuses.indexOf(order.status) * 25)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 px-1">
                  <span>Confirmed</span>
                  <span>Preparing</span>
                  <span>{order.purchase_mode === 'delivery' ? 'Shipping' : 'Ready'}</span>
                  <span>Completed</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
