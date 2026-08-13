import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
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
    fetchUsers();
  }, [debouncedSearch, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const fetchFn = adminAPI.users || adminAPI.getUsers;
      const res = await fetchFn({ search: debouncedSearch, q: debouncedSearch, page });
      const items = res.data?.items || res.data?.results || res.data || res.items || res;
      setUsers(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await adminAPI.toggleUser(id);
      toast.success('User status updated');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user');
    }
  };

  return (
    <div className="admin-users card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Users Management</h2>
        <div className="input-icon-wrap" style={{ minWidth: 240 }}>
          <Search size={16} className="icon-left" />
          <input 
            type="text" 
            className="form-input touch-target" 
            placeholder="Search users..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
      </div>
      <div className="card-body">
        {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
          users.length === 0 ? <div className="empty-state">No users found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td data-label="Email">{u.email}</td>
                    <td data-label="Name">{u.full_name || u.name || `${u.first_name || ''} ${u.last_name || ''}`}</td>
                    <td data-label="Role"><span className="badge badge-info">{u.role || u.role_name}</span></td>
                    <td data-label="Status"><span className={`badge ${u.is_active ? 'badge-success' : 'badge-error'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td data-label="Created">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td data-label="Actions">
                      <button className="btn btn-sm btn-secondary touch-target" onClick={() => handleToggleActive(u.id)}>
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination flex flex-between items-center" style={{ marginTop: 20 }}>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span className="text-sm font-semibold">Page {page}</span>
              <button className="btn btn-sm btn-secondary touch-target" onClick={() => setPage(p => p + 1)} disabled={users.length < 15}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
