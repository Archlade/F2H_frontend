import React, { useState, useEffect } from 'react';
import { adminAPI, toList } from '../../api';
import toast from 'react-hot-toast';

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.requests({ status: statusFilter, page });
      setRequests(toList(res.data));
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-requests card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Requests</h2>
        <select className="form-select touch-target" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="card-body">
        {loading ? <div className="spinner">Loading...</div> : (
          requests.length === 0 ? <div className="empty-state">No requests found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Farmer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td data-label="Request ID">{r.id}</td>
                    <td data-label="Customer">{r.customer}</td>
                    <td data-label="Farmer">{r.farmer}</td>
                    <td data-label="Product">{r.product}</td>
                    <td data-label="Quantity">{r.quantity}</td>
                    <td data-label="Status"><span className={`badge badge-info`}>{r.status}</span></td>
                    <td data-label="Created At">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination flex flex-between items-center" style={{ marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm font-semibold">Page {page}</span>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => p + 1)} disabled={requests.length < 15}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
