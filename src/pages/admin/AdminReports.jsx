import React, { useState, useEffect } from 'react';
import { adminAPI, toList } from '../../api';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.reports({ status: statusFilter });
      setReports(toList(res.data));
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminAPI.updateReport(id, { status });
      toast.success('Report updated');
      fetchReports();
    } catch (err) {
      toast.error('Failed to update report');
    }
  };

  return (
    <div className="admin-reports card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Reports</h2>
        <select className="form-select touch-target" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>
      <div className="card-body">
        {loading ? <div className="spinner">Loading...</div> : (
          reports.length === 0 ? <div className="empty-state">No reports found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td data-label="Reporter">{r.reporter?.full_name || '—'}</td>
                    <td data-label="Type">{r.report_type}</td>
                    <td data-label="Reason">{r.reason}</td>
                    <td data-label="Status"><span className={`badge badge-warning`}>{r.status}</span></td>
                    <td data-label="Actions">
                      <select className="form-select touch-target" value={r.status} onChange={e => handleUpdateStatus(r.id, e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
