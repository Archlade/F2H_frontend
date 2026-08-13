import React, { useEffect, useState } from 'react';
import { reviewsAPI, toList } from '../../api';
import { Loader, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  // Which review is showing its confirm prompt. Inline rather than window.confirm
  // so it matches the app, where deleting a review asks first.
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    reviewsAPI.list()
      .then(res => setReviews(toList(res.data)))
      .catch(() => toast.error('Failed to load reviews'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await reviewsAPI.delete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setConfirmId(null);
      toast.success('Review deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not delete this review');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="section-header mb-6">
        <h1 className="text-2xl font-bold">My Reviews</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="empty-state text-center p-12 bg-gray-50 rounded-lg">
          <Star className="empty-state__icon mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">No reviews yet</h3>
          <p className="text-gray-500">Purchase products to leave reviews.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map(review => (
            <div key={review.id} className="card p-5 border rounded-lg bg-white shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">{review.product_name || review.farmer_name}</h3>
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill={i < review.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
              </div>
              <h4 className="font-medium text-gray-800 mb-2">{review.title}</h4>
              <p className="text-gray-600 text-sm">{review.content}</p>

              <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400">
                  Posted on {new Date(review.created_at).toLocaleDateString()}
                </span>

                {confirmId === review.id ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Delete this review?</span>
                    <button
                      className="btn btn-error btn-sm"
                      style={{ borderRadius: 'var(--radius-full)' }}
                      disabled={deletingId === review.id}
                      onClick={() => handleDelete(review.id)}
                    >
                      {deletingId === review.id ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmId(null)}
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmId(review.id)}
                    aria-label="Delete this review"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerReviews;
