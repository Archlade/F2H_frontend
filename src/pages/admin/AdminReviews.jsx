import React, { useState, useEffect } from 'react';
import { adminAPI, toList } from '../../api';
import toast from 'react-hot-toast';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [flaggedOnly]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.reviews({ flagged: flaggedOnly });
      setReviews(toList(res.data));
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApprove = async (id) => {
    try {
      await adminAPI.approveReview(id);
      toast.success('Review status updated');
      fetchReviews();
    } catch (err) {
      toast.error('Failed to update review');
    }
  };

  return (
    <div className="admin-reviews card">
      <div className="card-header flex-between flex-wrap gap-3">
        <h2 className="text-h3">Reviews</h2>
        <label className="form-label flex items-center gap-2">
          <input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} />
          Show Flagged Only
        </label>
      </div>
      <div className="card-body">
        {loading ? <div className="spinner">Loading...</div> : (
          reviews.length === 0 ? <div className="empty-state">No reviews found</div> :
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Content</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(r => (
                  <tr key={r.id}>
                    <td data-label="Reviewer">{r.reviewer}</td>
                    <td data-label="Content" style={{ maxWidth: 320 }}>{r.content}</td>
                    <td data-label="Rating">{r.rating} / 5</td>
                    <td data-label="Status"><span className={`badge ${r.is_approved ? 'badge-success' : 'badge-error'}`}>{r.is_approved ? 'Approved' : 'Hidden'}</span></td>
                    <td data-label="Actions">
                      <button className="btn btn-sm btn-secondary touch-target" onClick={() => handleToggleApprove(r.id)}>
                        {r.is_approved ? 'Hide' : 'Approve'}
                      </button>
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
