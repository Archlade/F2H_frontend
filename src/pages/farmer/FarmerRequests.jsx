import React, { useEffect, useState } from 'react';
import { requestsAPI, toList } from '../../api';
import { Loader, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import OrderPrice from '../../components/OrderPrice';
import { Link } from 'react-router-dom';

const FarmerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await requestsAPI.list(activeTab !== 'all' ? { status: activeTab } : {});
      setRequests(toList(res.data));
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const updateStatus = async (id, status) => {
    try {
      await requestsAPI.updateStatus(id, { status });
      toast.success(`Request marked as ${status.replace('_', ' ')}`);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Requests</h1>
      
      <div className="flex gap-4 mb-6 border-b pb-2">
        {['pending', 'active', 'completed', 'all'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No requests found in this category.</p>
        </div>
      ) : (
        <div className="data-table-wrap overflow-x-auto bg-white rounded-lg shadow-sm border">
          <table className="data-table w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4">Customer</th>
                <th className="p-4">Product</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Total</th>
                <th className="p-4">Mode</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium" data-label="Customer">{req.customer_name}</td>
                  <td className="p-4" data-label="Product">{req.product_name}</td>
                  <td className="p-4" data-label="Qty">{req.quantity}</td>
                  <td className="p-4" data-label="Total"><OrderPrice order={req} size="sm" /></td>
                  <td className="p-4 capitalize" data-label="Mode">{req.purchase_mode}</td>
                  <td className="p-4 text-sm text-gray-500" data-label="Date">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="p-4" data-label="Status">
                    <span className={`badge status-${req.status} px-2 py-1 rounded text-xs capitalize`}>{req.status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="p-4" data-label="Actions">
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(req.id, 'accepted')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 touch-target" title="Accept"><Check size={18}/></button>
                        <button onClick={() => updateStatus(req.id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 touch-target" title="Reject"><X size={18}/></button>
                      </div>
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

export default FarmerRequests;
