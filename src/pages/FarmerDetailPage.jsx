import { useState, useEffect } from 'react'
import { mediaUrl } from '../utils/image'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Star, BadgeCheck, Package, Calendar, Tractor, Maximize2, X } from 'lucide-react'
import { farmersAPI, productsAPI, reviewsAPI, locationsAPI } from '../api'
import ProductCard from '../components/ProductCard'

export default function FarmerDetailPage() {
  const { id } = useParams()
  const [farmer, setFarmer] = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [mapExpanded, setMapExpanded] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [farmerRes, prodRes, revRes] = await Promise.all([
          farmersAPI.get(id),
          productsAPI.list({ farmer_id: id, per_page: 12 }),
          reviewsAPI.list({ farmer_id: id }),
        ])
        setFarmer(farmerRes.data)
        setProducts(prodRes.data.items || [])
        setReviews(revRes.data.items || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [id])

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 280 }} />
        <div className="container section-sm">
          <div className="skeleton" style={{ height: 24, width: '30%', borderRadius: 8, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 8 }} />
        </div>
      </div>
    )
  }

  if (!farmer) return (
    <div className="container section-sm">
      <div className="empty-state">
        <h3>Farmer not found</h3>
        <Link to="/farmers" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Farmers</Link>
      </div>
    </div>
  )

  const fp = farmer
  const user = farmer.user

  return (
    <div>
      {/* Cover.
          Height is set here rather than left to `aspect-ratio` + `max-height`.
          A ratio plus a cap is two rules fighting over one box, and it only has
          to lose once for a cover photo to swallow the page. A clamped height
          is one rule, always true: never shorter than 160, never taller than
          260, roughly a fifth of the viewport in between. */}
      <div
        className="farmer-detail-cover"
        style={{
          width: '100%',
          height: 'clamp(160px, 20vw, 260px)',
          background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Out of flow, so object-fit actually applies. In flow, height:100%
            resolves to auto against an auto-height parent and the image renders
            at its intrinsic height — cropped rather than centred. */}
        {fp.cover_image_url && (
          <img
            src={mediaUrl(fp.cover_image_url)}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)',
        }} />
      </div>

      <div className="container">
        {/* Profile.
            Only the avatar laps onto the cover. The whole row used to be pulled
            up 48px, which dragged the farm name and the stats onto the photo
            with it — dark text over an arbitrary uploaded image, unreadable
            whenever the image happened to be dark. The avatar has a white ring
            and is designed to sit on the seam; the words are not. */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 40 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-200), var(--color-primary-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary-800)',
            border: '4px solid white', boxShadow: 'var(--shadow-lg)',
            marginTop: -48, marginBottom: 16, overflow: 'hidden',
          }}>
            {fp.avatar_url ? (
              <img src={mediaUrl(fp.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : fp.farm_name?.[0]}
          </div>

          <div style={{
            display: 'flex', gap: 24, alignItems: 'flex-end',
            flexWrap: 'wrap', rowGap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                <h1 className="text-h2">{fp.farm_name}</h1>
                {fp.is_verified && (
                  <span className="badge badge-verified flex items-center gap-1">
                    <BadgeCheck size={12} /> Verified Farmer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted text-sm">
                <Tractor size={14} />
                {user?.full_name}
              </div>
            </div>

            <div className="flex gap-6">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{fp.product_count || products.length}</div>
                <div className="text-xs text-muted">Products</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="flex items-center gap-1">
                  <Star size={16} fill="var(--color-accent-400)" color="var(--color-accent-400)" />
                  <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Number(fp.rating_avg).toFixed(1)}</span>
                </div>
                <div className="text-xs text-muted">{fp.rating_count} reviews</div>
              </div>
              {fp.years_farming > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{fp.years_farming}</div>
                  <div className="text-xs text-muted">Years</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid-2" style={{ gap: 40, marginBottom: 56 }}>
          <div>
            {fp.bio && <p className="text-body-lg text-muted" style={{ lineHeight: 1.8, marginBottom: 20 }}>{fp.bio}</p>}
            {fp.farm_description && <p className="text-body text-muted" style={{ lineHeight: 1.7 }}>{fp.farm_description}</p>}

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fp.location && (
                <div className="flex items-center gap-2 text-muted text-sm">
                  <MapPin size={15} color="var(--color-primary-600)" />
                  {[fp.location.city, fp.location.state].filter(Boolean).join(', ')}
                </div>
              )}
              {fp.farming_type && (
                <div className="flex items-center gap-2 text-muted text-sm">
                  <Tractor size={15} color="var(--color-primary-600)" />
                  {fp.farming_type}
                </div>
              )}
            </div>
          </div>

          {fp.location?.latitude && (
            <div className="map-container farmer-map-preview" style={{ height: 240, position: 'relative' }}>
              <iframe
                title="Farm location"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(fp.location.longitude)-0.01},${Number(fp.location.latitude)-0.01},${Number(fp.location.longitude)+0.01},${Number(fp.location.latitude)+0.01}&layer=mapnik&marker=${fp.location.latitude},${fp.location.longitude}`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                loading="lazy"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm touch-target farmer-map-expand-btn"
                onClick={() => setMapExpanded(true)}
                aria-label="View full-screen map"
              >
                <Maximize2 size={14} /> Full Map
              </button>
            </div>
          )}
        </div>

        {mapExpanded && fp.location?.latitude && (
          <div className="farmer-map-fullscreen" role="dialog" aria-modal="true" aria-label="Farm location map">
            <button
              type="button"
              className="btn btn-secondary btn-icon touch-target farmer-map-fullscreen__close"
              onClick={() => setMapExpanded(false)}
              aria-label="Close map"
            >
              <X size={20} />
            </button>
            <iframe
              title="Farm location full screen"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(fp.location.longitude)-0.02},${Number(fp.location.latitude)-0.02},${Number(fp.location.longitude)+0.02},${Number(fp.location.latitude)+0.02}&layer=mapnik&marker=${fp.location.latitude},${fp.location.longitude}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <section style={{ marginBottom: 56 }}>
            <h2 className="text-h3" style={{ marginBottom: 24 }}>Products by {fp.farm_name}</h2>
            <div className="grid-auto">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section style={{ marginBottom: 56, borderTop: '1px solid var(--color-gray-100)', paddingTop: 48 }}>
          <h2 className="text-h3" style={{ marginBottom: 24 }}>Reviews ({fp.rating_count})</h2>
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ padding: '20px 24px', background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-gray-100)', boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                    <div className="avatar-placeholder avatar-sm" style={{ fontSize: '0.75rem' }}>{r.reviewer?.full_name?.[0]}</div>
                    <div>
                      <div className="font-semibold">{r.reviewer?.full_name}</div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={s <= r.rating ? 'var(--color-accent-400)' : 'none'} color="var(--color-accent-400)" />)}
                      </div>
                    </div>
                    <div className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{r.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p className="text-muted">No reviews yet for this farmer.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
