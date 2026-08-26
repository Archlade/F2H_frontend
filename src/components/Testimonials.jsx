import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

import { serviceReviewsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import ServiceReviewForm from './ServiceReviewForm'

/**
 * What people say about F2H, on the homepage — and the way to add to it.
 *
 * Only approved reviews reach here. The endpoint is public and filters on the
 * server, so there is no parameter this component could pass that would return
 * the pending ones. Nothing needs to be trusted on this side.
 *
 * This section used to render nothing until reviews existed. It cannot any
 * more, because it now carries the only entry point on a public page: hiding it
 * while empty would deadlock a new shop — no reviews, so no section, so no
 * form, so no reviews. With nothing to show it becomes an invitation, which is
 * not the same as an empty heading over blank space.
 */
export default function Testimonials() {
  const { isAuthenticated, user } = useAuth()
  const [items, setItems] = useState([])
  const [average, setAverage] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    serviceReviewsAPI.list({ per_page: 6 })
      .then((res) => {
        setItems(res.data?.items || [])
        setAverage(res.data?.average ?? null)
      })
      // Silent: this is the bottom of a marketing page, and a failed request
      // here should cost the section, not the homepage.
      .catch(() => {})
  }, [])

  const hasItems = items.length > 0

  // Customers and farmers both deal with the service and may review it. Admins
  // and delivery accounts are staff — the app drawer withholds it from them for
  // the same reason, and their words would sit oddly among customer reviews.
  const staff = user?.role === 'admin' || user?.role === 'delivery'
  const mayReview = isAuthenticated && !staff

  // Guests get a nudge to sign in rather than a form: every endpoint behind it
  // is jwt_required, so a form here would only ever produce a 401.
  const showCta = mayReview || !isAuthenticated

  // Staff, on a site with no reviews yet, would be looking at a heading and
  // nothing else. That is the one case still worth staying quiet for.
  if (!hasItems && !showCta) return null

  return (
    <section className="section" style={{ background: 'var(--color-gray-50)' }}>
      <div className="section-sm">
        <div style={{ textAlign: 'center', marginBottom: hasItems ? 28 : 20 }}>
          {/* Not "what our customers say" — farmers review the service too, and
              their reviews carry a Farmer label below. */}
          <h2 className="text-h2">
            {hasItems ? 'What people say about F2H' : 'How are we doing?'}
          </h2>

          {hasItems && average != null && (
            <div className="flex items-center justify-center gap-2" style={{ marginTop: 8 }}>
              <span className="flex" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={16}
                    fill={i <= Math.round(average) ? 'var(--color-accent-400)' : 'none'}
                    color={i <= Math.round(average)
                      ? 'var(--color-accent-500)'
                      : 'var(--color-gray-300)'}
                  />
                ))}
              </span>
              <span className="text-sm text-muted">
                {average} out of 5
              </span>
            </div>
          )}

          {!hasItems && (
            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
              Nobody has reviewed us yet. Be the first.
            </p>
          )}
        </div>

        {hasItems && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {items.map((r) => (
              <figure key={r.id} className="card" style={{ padding: 20, borderRadius: 'var(--radius-2xl)', margin: 0 }}>
                <span className="flex" aria-label={`${r.rating} out of 5`} style={{ marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i <= r.rating ? 'var(--color-accent-400)' : 'none'}
                      color={i <= r.rating ? 'var(--color-accent-500)' : 'var(--color-gray-300)'}
                    />
                  ))}
                </span>
                {r.comment && (
                  <blockquote className="text-sm" style={{ lineHeight: 1.7, margin: 0 }}>
                    “{r.comment}”
                  </blockquote>
                )}
                {/* First name and initial — that is all the API sends, and all
                    anybody agreed to have on a public page. The role is worth
                    showing: a farmer saying F2H sells what they grow carries
                    differently from a shopper praising the vegetables. */}
                <figcaption className="text-xs text-muted" style={{ marginTop: 12, fontWeight: 600 }}>
                  {r.author?.display_name || 'Someone who uses F2H'}
                  {r.author?.role === 'farmer' && (
                    <span style={{ fontWeight: 500 }}> · Farmer</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {showCta && (
          <div style={{ textAlign: 'center', marginTop: hasItems ? 28 : 0 }}>
            {mayReview ? (
              // Mounted only once asked for. The form fetches your existing
              // review on mount, and firing that request at everybody who
              // scrolls to the bottom of the homepage buys nothing.
              open ? (
                <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
                  <ServiceReviewForm />
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary touch-target"
                  onClick={() => setOpen(true)}
                >
                  Share your experience
                </button>
              )
            ) : (
              <>
                <Link to="/auth" className="btn btn-secondary touch-target">
                  Sign in to leave a review
                </Link>
                <p className="text-xs text-muted" style={{ marginTop: 10 }}>
                  We publish reviews with a first name only, and our team reads
                  every one first.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
