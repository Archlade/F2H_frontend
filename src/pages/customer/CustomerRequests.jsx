import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { Loader, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';

/**
 * `side` picks which half of a farmer's activity to show. Farmers buy from each
 * other, so the same account is the seller on one order and the buyer on the
 * next; passing 'buying' asks the API for the orders they placed rather than
 * the ones they are fulfilling. Customers leave it unset.
 */
/**
 * The states a buyer is still allowed to walk away from.
 *
 * Mirrors `BUYER_CANCELLABLE_FROM` in backend/app/models/request.py, and the
 * app's `customerMayCancel` in lib/data/models/order_status.dart. Up to here the
 * farmer has promised nothing: no stock is committed and nothing is picked.
 * `confirmed` is where that changes — it deducts inventory and starts a farmer
 * preparing goods they will not be paid for until someone reaches the door — so
 * the button stops there, which is what the checkout dialog promised.
 *
 * The server enforces this too. This only decides whether the button is worth
 * drawing: offering one that always fails is the worst of both.
 */
const BUYER_CANCELLABLE_FROM = ['pending', 'admin_review'];

const CustomerRequests = ({ side, title = 'Purchase Requests' }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelling, setCancelling] = useState(null);

  const fetchRequests = async (status) => {
    setLoading(true);
    try {
      const res = await requestsAPI.list({
        ...(status !== 'all' ? { status } : {}),
        ...(side ? { side } : {}),
      });
      setRequests(toList(res.data));
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter);
  }, [statusFilter, side]);

  const handleCancel = async (req) => {
    // `confirm` rather than a styled modal, deliberately: this is the one
    // irreversible thing on the page, and there is no undo on the other side.
    const ok = window.confirm(
      `Cancel your order for ${req.product_name}?\n\n` +
      'This cannot be undone. You would need to place a new order.'
    );
    if (!ok) return;

    setCancelling(req.id);
    try {
      await requestsAPI.updateStatus(req.id, { status: 'cancelled' });
      toast.success('Order cancelled');
      // Refetch rather than patch the row locally: cancelling can move an order
      // out of the current filter entirely, and the server is what decides.
      await fetchRequests(statusFilter);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not cancel that order');
    } finally {
      setCancelling(null);
    }
  };

  const tabs = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

  return (
    <div className="p-6">
      <div className="section-header mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 capitalize font-medium ${statusFilter === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <FileText className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
          <p className="text-gray-500">You haven't made any requests with this status.</p>
        </div>
      ) : (
        <div className="data-table-wrap overflow-x-auto">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3">Product</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Total Price</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium" data-label="Product">{req.product_name}</td>
                  <td className="p-3" data-label="Quantity">{req.quantity}</td>
                  <td className="p-3" data-label="Total Price">
                    <OrderPrice order={req} size="sm" />
                    {/* What to have ready at the door. No button: the customer
                        pays in person, and only the farmer can record it. */}
                    <CashOnDelivery order={req} orderType="request" />
                  </td>
                  <td className="p-3 capitalize" data-label="Mode">{req.purchase_mode?.replace('_', ' ')}</td>
                  <td className="p-3 text-sm text-gray-600" data-label="Date">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="p-3" data-label="Status">
                    <span className={`badge status-${req.status} capitalize px-2 py-1 rounded text-xs`}>{req.status?.replace('_', ' ')}</span>
                  </td>
                  <td className="p-3" data-label="Actions">
                    {/* Only the buyer's own orders. When `side` is set this
                        table is a farmer looking at what they are selling, and
                        a seller cancelling is a rejection with its own rules —
                        that lives on the farmer's own orders screen. */}
                    {!side && BUYER_CANCELLABLE_FROM.includes(req.status) && (
                      <button
                        type="button"
                        className="btn btn-error btn-sm touch-target"
                        onClick={() => handleCancel(req)}
                        disabled={cancelling === req.id}
                      >
                        {cancelling === req.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerRequests;
