import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', type: 'info', target_role: 'all' });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await adminAPI.getAnnouncements();
      setAnnouncements(res.data || res);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAnnouncement(form);
      toast.success('Announcement created');
      setForm({ title: '', content: '', type: 'info', target_role: 'all' });
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to create announcement');
    }
  };

  return (
    <div className="admin-announcements">
      <div className="card mb-4">
        <div className="card-header">
          <h2>Create Announcement</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input type="text" className="form-input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea className="form-input" required value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Role</label>
              <select className="form-select" value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})}>
                <option value="all">All Users</option>
                <option value="farmer">Farmers</option>
                <option value="customer">Customers</option>
              </select>
            </div>
            <button className="btn btn-primary touch-target" type="submit">Create Announcement</button>
          </form>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2>Past Announcements</h2>
        </div>
        <div className="card-body">
          {loading ? <div className="spinner">Loading...</div> : (
            announcements.length === 0 ? <div className="empty-state">No announcements</div> :
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Target Role</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a, i) => (
                    <tr key={i}>
                      <td data-label="Title">{a.title}</td>
                      <td data-label="Type"><span className={`badge badge-${a.type === 'error' ? 'danger' : a.type}`}>{a.type}</span></td>
                      <td data-label="Target Role">{a.target_role}</td>
                      <td data-label="Date">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
