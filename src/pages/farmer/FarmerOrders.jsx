import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { Loader, Package, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';

// What the farmer may set next, given where the order is and who collects it.
//
// Mirrors `VALID_TRANSITIONS` ∩ `PARTY_TRANSITIONS['seller']` on the server.
// The dropdown used to list every option unconditionally, so a farmer could
// pick "Accepted" on a delivered order or "Completed" on one still preparing —
// both refused by the server, leaving a control that snaps back with an error.
//
// The farmer's run is the same on both lanes: confirm → preparing → ready. What
// differs is the end. On a pickup order the customer collects at the farm and
// pays them directly, so the farmer closes it. On a delivery order F2H takes it
// from here, and completion waits for the courier's cash to reach the office.
const farmerNextStatuses = (status, purchaseMode) => {
  const isPickup = purchaseMode === 'pickup';
  switch (status) {
    case 'pending':
    case 'admin_review':
    case 'accepted':
    case 'chat_active':
      return [['confirmed', 'Confirm order'], ['rejected', 'Reject']];
    case 'confirmed':
      return [['preparing', 'Preparing']];
    case 'preparing':
      return [['ready_for_pickup', isPickup ? 'Ready for customer pickup' : 'Ready for collection']];
    case 'ready_for_pickup':
      return isPickup ? [['completed', 'Collected & paid — complete']] : [];
    default:
      return [];
  }
};

// Shown disabled so the farmer can see where the order has got to, rather than
// an empty dropdown that looks broken. None of these are theirs to set.
const FOLLOW_ON_LABELS = {
  picked_up: 'Collected by F2H',
  out_for_delivery: 'Out for delivery',
  cash_collected: 'Delivered — cash with courier',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

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
                  <p className="text-sm text-gray-500">{order.customer?.full_name || 'Customer'}</p>
                </div>
                <div className="text-right">
                  <span className={`badge status-${order.status} capitalize text-xs px-2 py-1 rounded`}>{order.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              
              <div className="mb-4 flex-1">
                <p className="font-medium">{order.product?.name || `Order #${order.id}`}</p>
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
                {(() => {
                  const nexts = farmerNextStatuses(order.status, order.purchase_mode)
                  // Nothing left for the farmer to do: show where it is instead
                  // of a dropdown whose every option the server would refuse.
                  if (nexts.length === 0) {
                    return (
                      <span className="text-sm text-gray-500">
                        {FOLLOW_ON_LABELS[order.status] || 'With F2H'}
                      </span>
                    )
                  }
                  return (
                    <select
                      value=""
                      onChange={(e) => e.target.value && handleStatusChange(order.id, e.target.value)}
                      className="border rounded p-1 text-sm bg-gray-50"
                    >
                      {/* Placeholder, not the current status: this list is what
                          the order can move *to*, so pre-selecting a value would
                          show a state the order is not in. */}
                      <option value="">Choose…</option>
                      {nexts.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FarmerOrders;
