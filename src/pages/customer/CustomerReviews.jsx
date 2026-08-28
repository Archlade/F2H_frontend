import React, { useEffect, useState } from 'react';
import { requestsAPI, reviewsAPI, toList } from '../../api';
import { Loader, Star, Trash2, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  // Which review is showing its confirm prompt. Inline rather than window.confirm
  // so it matches the app, where deleting a review asks first.
  const [confirmId, setConfirmId] = useState(null);

  // Completed orders are the only things that may be reviewed — the server
  // refuses anything else with NO_PURCHASE, so offering the rest would only
  // produce a refusal. Same rule the app's review screen follows.
  const [reviewable, setReviewable] = useState([]);
  const [writing, setWriting] = useState(null);

  const loadReviews = () =>
    reviewsAPI.list()
      .then(res => setReviews(toList(res.data)))
      .catch(() => toast.error('Failed to load reviews'));

  useEffect(() => {
    loadReviews().finally(() => setLoading(false));
    requestsAPI.list({ status: 'completed', per_page: 50 })
      .then(res => setReviewable(toList(res.data)))
      .catch(() => setReviewable([]));
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

      {/* The website could read and delete reviews but never write one — the
          only way to rate anything was the app. */}
      {reviewable.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-1">Rate what you have received</h2>
          <p className="text-sm text-gray-500 mb-3">
            {reviewable.length} completed order{reviewable.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviewable.map(order => (
              <div key={order.id} className="card p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div style={{ minWidth: 0 }}>
                    <div className="font-semibold">
                      {order.product?.name || `Order #${order.id}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.farmer?.farm_name || 'Farm'}
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm"
                          onClick={() => setWriting(order)}>
                    <PenLine size={14} /> Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {writing && (
        <ReviewForm
          order={writing}
          onClose={() => setWriting(null)}
          onSaved={() => { setWriting(null); loadReviews(); }}
        />
      )}

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
                <h3 className="font-semibold text-lg">
                  {review.product?.name || review.farmer?.name || 'Review'}
                </h3>
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

/**
 * Write or replace a review for one completed order.
 *
 * The server replaces an earlier review of the same product or farm rather than
 * refusing a second one, so there is no "already reviewed" state to handle here.
 *
 * Only the ids travel. The rating and text are the whole payload — nothing about
 * the order's price or the farmer's identity is taken from the client, because
 * the server already knows all of it from `product_id`.
 */
function ReviewForm({ order, onClose, onSaved }) {
  const [rating, setRating] = useState(5);
  const [reviewFarm, setReviewFarm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await reviewsAPI.create({
        rating,
        // No `request_id`. The server finds the qualifying purchase itself and
        // ignores a client-supplied one, so sending it would suggest it matters.
        product_id: reviewFarm ? undefined : order.product?.id,
        farmer_id: reviewFarm ? order.farmer?.id : undefined,
        title: title.trim(),
        content: content.trim(),
      });
      toast.success('Thanks for the review');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save that review');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-bottom-sheet" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="text-h4">Write a review</h3>
          <button className="btn btn-ghost btn-icon touch-target" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="text-sm text-gray-600">
              {reviewFarm
                ? (order.farmer?.farm_name || 'This farm')
                : (order.product?.name || `Order #${order.id}`)}
            </div>

            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}
                        aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        className="btn btn-ghost btn-icon">
                  <Star size={22}
                        className={n <= rating ? 'text-yellow-400' : 'text-gray-300'}
                        fill={n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            {order.farmer?.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reviewFarm}
                       onChange={(e) => setReviewFarm(e.target.checked)} />
                Review the farm instead of the product
              </label>
            )}

            <div className="form-group">
              <label className="form-label">Title (optional)</label>
              <input className="form-input" value={title} maxLength={255}
                     onChange={(e) => setTitle(e.target.value)}
                     placeholder="Sweet and fresh" />
            </div>

            <div className="form-group">
              <label className="form-label">Your review</label>
              <textarea className="form-input" rows={4} value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="How was it?" />
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Post review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerReviews;
