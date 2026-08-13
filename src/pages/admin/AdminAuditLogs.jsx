import React, { useState, useEffect } from 'react';
import { adminAPI, toList } from '../../api';
import toast from 'react-hot-toast';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.auditLogs({ page });
      setLogs(toList(res.data));
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-audit-logs card">
      <div className="card-header">
        <h2 className="text-h3">Audit Logs</h2>
      </div>
      <div className="card-body">
        {loading ? <div className="spinner">Loading...</div> : (
          logs.length === 0 ? <div className="empty-state">No logs found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx}>
                    <td data-label="Admin">{log.admin}</td>
                    <td data-label="Action">{log.action}</td>
                    <td data-label="Entity Type">{log.entity_type}</td>
                    <td data-label="Entity ID">{log.entity_id}</td>
                    <td data-label="Date">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination flex flex-between items-center" style={{ marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm font-semibold">Page {page}</span>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => p + 1)} disabled={logs.length < 15}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
