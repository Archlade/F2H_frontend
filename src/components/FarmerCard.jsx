import { Link } from 'react-router-dom'
import { mediaUrl } from '../utils/image'
import { MapPin, Star, BadgeCheck, Sprout, ArrowRight } from 'lucide-react'

/**
 * One farm, in a grid.
 *
 * Built around what the *list* endpoint actually returns, which is narrower
 * than the detail endpoint: there is no `product_count` here, so a card that
 * leads with one shows nothing. A farm with no bio, no rating and no distance
 * is the common case on a young marketplace, and the card has to look
 * deliberate in that state rather than like a loading failure.
 */
export default function FarmerCard({ farmer }) {
  if (!farmer) return null

  // `user_id`, not `id`. `id` is the farmer *profile* row, while /farmers/:id
  // resolves a **user** — so linking by `id` opened whichever farm happened to
  // hold that user id, or 404'd. They match only while the two tables happen to
  // stay in step, which is exactly the kind of coincidence that stops being one.
  const href = `/farmers/${farmer.user_id ?? farmer.id}`

  const rating = Number(farmer.rating_avg) || 0
  const ratingCount = Number(farmer.rating_count) || 0
  const years = Number(farmer.years_farming) || 0

  return (
    <Link
      to={href}
      className="card farmer-card"
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
    >
      {/* Cover
          The image is absolutely positioned rather than laid out in flow.
          `aspect-ratio` only sets a *preferred* size — a box still grows to fit
          its content — so an in-flow <img> with height:100% resolves to auto
          against an auto-height parent and renders at full intrinsic height.
          One tall upload stretched the card to ~700px, and because grid items
          stretch to the tallest in the row, it dragged every other card with
          it. Out of flow, the ratio is what decides the height. */}
      <div
        style={{
          // 4:1 rather than 3:1. Most farms have no cover image, so this band
          // is usually an empty gradient — at 3:1 it was ~190px of nothing
          // above three lines of text, which made every card read as a banner
          // with an afterthought attached.
          aspectRatio: '4 / 1',
          background: 'linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {farmer.cover_image_url && (
          <img
            src={mediaUrl(farmer.cover_image_url)}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {farmer.is_verified && (
          <div
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'white', borderRadius: 'var(--radius-full)',
              padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary-700)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <BadgeCheck size={13} /> Verified
          </div>
        )}
      </div>

      <div
        className="card-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 0 }}
      >
        {/* Avatar, overlapping the cover.
            `position: relative` is load-bearing, not decoration. The cover
            above is positioned, and a positioned element paints above a static
            sibling regardless of DOM order — so the half of the avatar pulled
            up by the negative margin was being painted *over* by the cover and
            rendered as a sliced-off semicircle. Giving the avatar its own
            position puts it back in the same painting layer, on top. */}
        <div
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-200), var(--color-primary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.125rem', color: 'var(--color-primary-800)',
            marginTop: -26, marginBottom: 10, border: '3px solid white',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0, overflow: 'hidden',
            position: 'relative', zIndex: 1,
          }}
        >
          {farmer.avatar_url ? (
            <img
              src={mediaUrl(farmer.avatar_url)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            farmer.farm_name?.[0]?.toUpperCase() || 'F'
          )}
        </div>

        <h3
          style={{
            fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-900)',
            marginBottom: 4, lineHeight: 1.3,
          }}
        >
          {farmer.farm_name || 'Unnamed farm'}
        </h3>

        {/* Two clamped lines, always. A farm with no bio gets a neutral line
            rather than a hole — the card keeps its shape either way, which is
            what stops a row of cards looking half-broken. */}
        <p
          className="text-sm text-muted"
          style={{
            lineHeight: 1.6, marginBottom: 14, minHeight: '2.6em',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {farmer.bio
            || farmer.farm_description
            || 'Fresh produce, delivered from this farm to your door.'}
        </p>

        <div
          className="flex items-center gap-3 flex-wrap"
          style={{ marginTop: 'auto', fontSize: '0.8125rem' }}
        >
          {rating > 0 ? (
            <span className="flex items-center gap-1">
              <Star size={14} fill="var(--color-accent-400)" color="var(--color-accent-400)" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
              {ratingCount > 0 && <span className="text-muted">({ratingCount})</span>}
            </span>
          ) : (
            // Says something true instead of leaving the row empty: no rating
            // on a marketplace this young means new, not bad.
            <span className="badge badge-gray">New farm</span>
          )}

          {farmer.distance_km != null && (
            <span className="flex items-center gap-1 text-muted">
              <MapPin size={13} />
              {farmer.distance_km < 1
                ? `${(farmer.distance_km * 1000).toFixed(0)}m`
                : `${Number(farmer.distance_km).toFixed(1)} km`}
            </span>
          )}

          {years > 0 && (
            <span className="flex items-center gap-1 text-muted">
              <Sprout size={13} />
              {years} yr{years === 1 ? '' : 's'} farming
            </span>
          )}

          <span
            className="flex items-center gap-1 font-semibold"
            style={{ marginLeft: 'auto', color: 'var(--color-primary-700)' }}
          >
            View farm <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  )
}
