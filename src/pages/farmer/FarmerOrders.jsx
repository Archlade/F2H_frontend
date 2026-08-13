import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { Loader, Package, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';

const FarmerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await requestsAPI.list({ status: 'active_orders' });
      setOrders(toList(res.data));
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await requestsAPI.updateStatus(id, { status: newStatus });
      toast.success('Order status updated');
      fetchOrders();
    } catch (err) {
      // The server's message is what explains a refused transition — most often
      // "record the cash first" on a completion. Swallowing it for a generic
      // string leaves the farmer with a dropdown that silently snaps back.
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Active Orders to Fulfill</h1>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No active orders right now</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order.id} className="card border rounded-lg p-5 bg-white shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-3 border-b pb-3">
                <div>
                  <h3 className="font-bold text-lg">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <span className={`badge status-${order.status} capitalize text-xs px-2 py-1 rounded`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              
              <div className="mb-4 flex-1">
                <p className="font-medium">{order.product_name}</p>
                <div className="text-gray-600">Qty: {order.quantity}</div>
                <OrderPrice order={order} />
                <p className="text-sm text-gray-500 mt-2">Mode: <span className="capitalize font-medium text-gray-700">{order.purchase_mode}</span></p>
                <CashOnDelivery
                  order={order}
                  orderType="request"
                  canCollect
                  onCollected={fetchOrders}
                />
              </div>

              <div className="mt-auto pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Update Status:</span>
                <select 
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className="border rounded p-1 text-sm bg-gray-50"
                >
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready_for_pickup">Ready for customer pickup</option>
                  <option value="completed">Completed</option>
                  {/* Collected by F2H and Out for delivery are not here on
                      purpose. Collection is when F2H hands over the cash, so
                      it is recorded by whoever pays — the server rejects a
                      farmer setting either, and an option that always errors
                      is worse than no option. */}
                  {order.status === 'picked_up' && (
                    <option value="picked_up" disabled>Collected by F2H</option>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <option value="out_for_delivery" disabled>Out for delivery</option>
                  )}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerOrders;
