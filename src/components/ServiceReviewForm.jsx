import { useEffect, useState } from 'react'
import { Loader, MessageSquare, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { serviceReviewsAPI } from '../api'

/**
 * Tell us what you think of F2H — the app, the site, the service.
 *
 * Not a product review. Those live on a product page and affect that farm's
 * rating; this is about the whole experience and, once approved, appears on
 * the homepage.
 *
 * One per customer. Opening this when you have already left feedback loads it
 * for editing rather than offering a blank form, because a second opinion of
 * the same service from the same person is not a second review — and the
 * server would replace it anyway.
 */

const MAX = 1000

export default function ServiceReviewForm() {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    serviceReviewsAPI.mine()
      .then((res) => {
        // The endpoint answers `null` for somebody who has not left one, which
        // is a 200 rather than a 404 — "you have no review" is an answer, not
        // a failure.
        if (!res.data) return
        setExisting(res.data)
        setRating(res.data.rating || 0)
        setComment(res.data.comment || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Choose a rating first')

    setSaving(true)
    try {
      const { data } = await serviceReviewsAPI.submit({ rating, comment })
      setExisting(data)
      toast.success(data.message || 'Thank you for your feedback')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send that')
    } finally {
      setSaving(false)
    }
  }

  const withdraw = async () => {
    if (!window.confirm('Remove your feedback?')) return
    try {
      await serviceReviewsAPI.withdraw()
      setExisting(null); setRating(0); setComment('')
      toast.success('Your feedback has been removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not remove that')
    }
  }

  if (loading) {
    return (
      <div className="card flex justify-center" style={{ padding: 32, borderRadius: 'var(--radius-2xl)' }}>
        <Loader className="animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 28, borderRadius: 'var(--radius-2xl)' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <MessageSquare size={18} className="text-muted" />
        <h2 className="text-h4">{existing ? 'Your feedback' : 'How are we doing?'}</h2>
      </div>
      <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
        Tell us what you think of F2H — the ordering, the deliveries, the app.
        This is about our service rather than any one farm or product.
      </p>

      <div className="form-group">
        <label className="form-label" id="sr-rating-label">Your rating</label>
        <div
          className="flex gap-1"
          role="radiogroup"
          aria-labelledby="sr-rating-label"
          onMouseLeave={() => setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              onMouseEnter={() => setHovered(n)}
              onClick={() => setRating(n)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, lineHeight: 0,
              }}
            >
              <Star
                size={30}
                // Filled up to whichever is showing — the hover preview when
                // the pointer is over the row, otherwise the real choice.
                fill={n <= (hovered || rating) ? 'var(--color-accent-400)' : 'none'}
                color={n <= (hovered || rating)
                  ? 'var(--color-accent-500)'
                  : 'var(--color-gray-300)'}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="sr-comment">Anything you would like to add?</label>
        <textarea
          id="sr-comment"
          className="form-input"
          rows={4}
          maxLength={MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What worked well, what did not…"
          style={{ resize: 'vertical' }}
        />
        <small className="text-muted" style={{ display: 'block', marginTop: 6 }}>
          {comment.length}/{MAX}
        </small>
      </div>

      {/*
        Said plainly rather than left as a surprise. Somebody typing a complaint
        should know it is going to a person and not straight onto the homepage;
        somebody typing praise should know it might be published.
      */}
      <p className="text-xs text-muted" style={{ lineHeight: 1.6, marginBottom: 16 }}>
        {existing?.is_approved
          ? 'This is currently shown on our homepage. Editing it sends it back to our team for review.'
          : 'Our team reads every message. With your permission we may show it on our homepage — first name only.'}
      </p>

      <div className="flex gap-2 flex-wrap">
        <button type="submit" className="btn btn-primary touch-target" disabled={saving || !rating}>
          {saving ? 'Sending…' : existing ? 'Update feedback' : 'Send feedback'}
        </button>
        {existing && (
          <button type="button" className="btn btn-ghost touch-target" onClick={withdraw}>
            <Trash2 size={15} /> Remove
          </button>
        )}
      </div>
    </form>
  )
}
