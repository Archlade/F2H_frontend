import React, { useState, useEffect } from 'react';
import { adminAPI, categoriesAPI, toList } from '../../api';
import toast from 'react-hot-toast';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.list();
      setCategories(toList(res.data));
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createCategory({ name, icon });
      toast.success('Category created');
      setName('');
      setIcon('');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="admin-categories card">
      <div className="card-header">
        <h2>Categories</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleCreate} className="mb-4">
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Icon (lucide-react name)</label>
            <input type="text" className="form-input" required value={icon} onChange={e => setIcon(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary touch-target">Create Category</button>
        </form>

        {loading ? <div className="spinner">Loading...</div> : (
          categories.length === 0 ? <div className="empty-state">No categories</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Icon</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td data-label="ID">{c.id}</td>
                    <td data-label="Name">{c.name}</td>
                    <td data-label="Icon">{c.icon}</td>
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
