import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'

import { serviceReviewsAPI } from '../api'

/**
 * What customers say about F2H, on the homepage.
 *
 * Only approved reviews reach here — the endpoint is public and filters on the
 * server, so there is no parameter this component could pass that would return
 * the pending ones. Nothing needs to be trusted on this side.
 *
 * Renders nothing at all until there are reviews. An empty "What our customers
 * say" heading over a blank space says something worse than silence, and a new
 * shop has no testimonials by definition.
 */
export default function Testimonials() {
  const [items, setItems] = useState([])
  const [average, setAverage] = useState(null)

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

  if (items.length === 0) return null

  return (
    <section className="section" style={{ background: 'var(--color-gray-50)' }}>
      <div className="section-sm">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 className="text-h2">What our customers say</h2>
          {average != null && (
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
        </div>

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
                  anybody agreed to have on a public page. */}
              <figcaption className="text-xs text-muted" style={{ marginTop: 12, fontWeight: 600 }}>
                {r.author?.display_name || 'A customer'}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
