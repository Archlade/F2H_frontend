import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { MessageSquare, Loader, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import CashOnDelivery from '../../components/CashOnDelivery';
import { Link } from 'react-router-dom';

/**
 * `side` picks which half of a farmer's activity to show. Farmers buy from each
 * other, so the same account is the seller on one order and the buyer on the
 * next; passing 'buying' asks the API for the orders they placed rather than
 * the ones they are fulfilling. Customers leave it unset.
 */
const CustomerRequests = ({ side, title = 'Purchase Requests' }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

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

  const tabs = ['all', 'pending', 'accepted', 'completed', 'cancelled'];

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
                    {['chat_active', 'accepted', 'completed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(req.status) && (
                      <Link to={`/dashboard/chat/${req.chat_id || req.id}`} className="btn btn-sm btn-primary inline-flex items-center gap-1 touch-target">
                        <MessageSquare size={14} /> Open Chat
                      </Link>
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
