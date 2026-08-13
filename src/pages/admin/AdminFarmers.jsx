import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export default function AdminFarmers() {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchFarmers();
  }, [debouncedSearch, page]);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const fetchFn = adminAPI.farmers || adminAPI.getFarmers;
      const res = await fetchFn({ search: debouncedSearch, q: debouncedSearch, page });
      const items = res.data?.items || res.data?.results || res.data || res.items || res;
      setFarmers(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error('Failed to load farmers');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await adminAPI.verifyFarmer(id);
      toast.success('Farmer status updated');
      fetchFarmers();
    } catch (err) {
      toast.error('Failed to update farmer');
    }
  };

  const handleSuspend = async (id) => {
    try {
      await adminAPI.suspendFarmer(id);
      toast.success('Farmer status updated');
      fetchFarmers();
    } catch (err) {
      toast.error('Failed to update farmer');
    }
  };

  return (
    <div className="admin-farmers card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Farmers Management</h2>
        <div className="input-icon-wrap" style={{ minWidth: 240 }}>
          <Search size={16} className="icon-left" />
          <input 
            type="text" 
            className="form-input touch-target" 
            placeholder="Search farmers..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>
      <div className="card-body">
        {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
          farmers.length === 0 ? <div className="empty-state">No farmers found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farm Name</th>
                  <th>Email</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map(f => (
                  <tr key={f.id || f.user_id}>
                    <td data-label="Farm Name">{f.farm_name}</td>
                    <td data-label="Email">{f.user?.email || f.email}</td>
                    <td data-label="Verification"><span className={`badge ${f.is_verified ? 'badge-success' : 'badge-warning'}`}>{f.is_verified ? 'Verified' : 'Pending'}</span></td>
                    <td data-label="Status"><span className={`badge ${f.is_suspended ? 'badge-error' : 'badge-success'}`}>{f.is_suspended ? 'Suspended' : 'Active'}</span></td>
                    <td data-label="Actions" className="flex gap-2 justify-end">
                      {!f.is_verified && <button className="btn btn-sm btn-primary touch-target" onClick={() => handleVerify(f.id || f.user_id)}>Verify</button>}
                      <button className="btn btn-sm btn-danger touch-target" onClick={() => handleSuspend(f.id || f.user_id)}>{f.is_suspended ? 'Unsuspend' : 'Suspend'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination flex flex-between items-center" style={{ marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm font-semibold">Page {page}</span>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => p + 1)} disabled={farmers.length < 15}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
