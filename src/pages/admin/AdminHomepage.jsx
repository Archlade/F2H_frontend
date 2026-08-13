import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';

export default function AdminHomepage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getHomepageContent();
      setSections(res.data || res);
    } catch (err) {
      toast.error('Failed to load homepage sections');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sec) => {
    setEditingKey(sec.section_key);
    setEditForm(sec);
  };

  const handleSave = async (key) => {
    try {
      await adminAPI.updateHomepageSection(key, editForm);
      toast.success('Section updated');
      setEditingKey(null);
      fetchSections();
    } catch (err) {
      toast.error('Failed to update section');
    }
  };

  if (loading) return <div className="spinner">Loading...</div>;

  return (
    <div className="admin-homepage">
      <h1>Homepage Sections</h1>
      {sections.length === 0 ? <div className="empty-state">No sections found</div> : 
        sections.map(sec => (
          <div key={sec.section_key} className="card mb-4">
            <div className="card-header">
              <h2>{sec.section_key}</h2>
            </div>
            <div className="card-body">
              {editingKey === sec.section_key ? (
                <div>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subtitle</label>
                    <input className="form-input" value={editForm.subtitle || ''} onChange={e => setEditForm({...editForm, subtitle: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CTA Label</label>
                    <input className="form-input" value={editForm.cta_label || ''} onChange={e => setEditForm({...editForm, cta_label: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sort Order</label>
                    <input type="number" className="form-input" value={editForm.sort_order || 0} onChange={e => setEditForm({...editForm, sort_order: parseInt(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <input type="checkbox" checked={editForm.is_visible} onChange={e => setEditForm({...editForm, is_visible: e.target.checked})} />
                      Is Visible
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary touch-target" onClick={() => handleSave(sec.section_key)}>Save</button>
                    <button className="btn btn-secondary touch-target" onClick={() => setEditingKey(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p><strong>Title:</strong> {sec.title}</p>
                  <p><strong>Subtitle:</strong> {sec.subtitle}</p>
                  <p><strong>CTA Label:</strong> {sec.cta_label}</p>
                  <p><strong>Sort Order:</strong> {sec.sort_order}</p>
                  <p><strong>Visible:</strong> {sec.is_visible ? 'Yes' : 'No'}</p>
                  <button className="btn btn-secondary touch-target" onClick={() => handleEdit(sec)} style={{ marginTop: 12 }}>Edit</button>
                </div>
              )}
            </div>
          </div>
        ))
      }
    </div>
  );
}
