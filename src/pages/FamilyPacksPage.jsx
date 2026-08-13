import { useState, useEffect } from 'react'
import { mediaUrl } from '../utils/image'
import { Link } from 'react-router-dom'
import { Search, Package, Users, Truck, ArrowRight, Star, BadgeCheck, Leaf, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react'
import { familyPacksAPI } from '../api'
import toast from 'react-hot-toast'

export default function FamilyPacksPage() {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async (query = '') => {
    setLoading(true)
    try {
      const res = await familyPacksAPI.list({ q: query })
      setPacks(res.data.items || [])
    } catch {
      toast.error('Failed to load family packs')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPacks(search)
  }

  return (
    <div className="container section-sm">
      {/* ── Premium Hero Section ── */}
      <div className="fp-hero">
        <div className="fp-hero__grid">
          <div>
            <div className="fp-hero__tag">
              <Leaf size={14} /> YOUR WEEKLY GROCERY ROUTINE
            </div>
            <h1 className="fp-hero__title">
              Your family's weekly groceries,<br />taken care of.
            </h1>
            <p className="fp-hero__desc">
              Choose the vegetables your family uses every week. We'll organize them into your Family Pack and deliver them on your chosen day.
            </p>

            <div className="flex gap-3 flex-wrap" style={{ marginBottom: 28 }}>
              <Link to="/dashboard/family-pack/new" className="btn btn-accent btn-lg touch-target font-bold" style={{ borderRadius: 'var(--radius-full)' }}>
                Build my weekly basket <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard/family-pack-orders" className="btn btn-secondary btn-lg touch-target" style={{ borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Manage my basket
              </Link>
              <a href="#available-packs" className="btn btn-secondary btn-lg touch-target" style={{ borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
                Browse Bundles
              </a>
            </div>

            {/* Feature Pills */}
            <div className="flex gap-4 flex-wrap text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={15} color="#34d399" /> Weekly Automated Delivery</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={15} color="#34d399" /> Farm Fresh Guaranteed</span>
              <span className="flex items-center gap-1.5"><Calendar size={15} color="#34d399" /> Flexible Schedule & Pause</span>
            </div>
          </div>

          {/* Floating Product Basket Composition */}
          <div className="fp-hero__illustration">
            <div className="fp-hero__float-badge fp-hero__float-badge--1">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={18} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Guaranteed</div>
                <div>Doorstep Delivery</div>
              </div>
            </div>

            <div className="fp-hero__card-stack" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
              <div className="flex items-center justify-between" style={{ color: 'white', marginBottom: 12 }}>
                <span className="badge" style={{ background: '#34d399', color: '#064e3b', fontWeight: 800 }}>FEATURED BUNDLE</span>
                <span className="text-xs font-semibold">Fresh Harvest</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, color: 'white' }}>
                <div className="font-bold text-lg" style={{ marginBottom: 4 }}>Weekly Veggie Basket</div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Tomatoes • Potatoes • Onions • Carrots • Greens</div>
              </div>
              <div className="flex items-center justify-between" style={{ marginTop: 'auto', paddingTop: 12 }}>
                <div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Weekly Price</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>₹499.00</div>
                </div>
                <div style={{ background: 'white', color: '#064e3b', padding: '8px 16px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 800 }}>
                  Order Now
                </div>
              </div>
            </div>

            <div className="fp-hero__float-badge fp-hero__float-badge--2">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={18} color="#d97706" fill="#d97706" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>Rated 4.9/5</div>
                <div>Family Favorite</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div id="available-packs" className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <div>
          <h2 className="text-h3">Curated Family Packs</h2>
          <p className="text-sm text-muted">Direct from local verified farmers to your doorstep</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2" style={{ maxWidth: 360, width: '100%' }}>
          <div className="input-icon-wrap" style={{ flex: 1 }}>
            <Search className="icon-left" size={18} />
            <input
              className="form-input"
              type="text"
              placeholder="Search packs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: 'var(--radius-full)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>Search</button>
        </form>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 380, borderRadius: 'var(--radius-2xl)' }} />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0', background: 'white', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)' }}>
          <div className="empty-state__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <Package size={32} />
          </div>
          <h3 className="text-h4">Build your family's weekly grocery routine</h3>
          <p className="text-muted" style={{ maxWidth: 460, margin: '8px auto 20px' }}>
            Choose your regular vegetables once and we'll keep your weekly shopping simple and delivered fresh.
          </p>
          <Link to="/dashboard/family-pack-orders" className="btn btn-primary btn-lg touch-target" style={{ borderRadius: 'var(--radius-full)' }}>
            Create Family Pack
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs.map((pack) => (
            <div key={pack.id} className="card product-card" style={{ display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)', transition: 'all 0.3s ease' }}>
              <div style={{ height: 220, position: 'relative', overflow: 'hidden', background: 'var(--color-gray-100)' }}>
                {pack.banner_image ? (
                  <img src={mediaUrl(pack.banner_image)} alt={pack.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={54} color="var(--color-gray-300)" />
                  </div>
                )}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <span className="badge badge-success flex items-center gap-1" style={{ background: '#10b981', color: 'white', padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                    <Leaf size={12} /> WEEKLY BUNDLE
                  </span>
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span className="badge badge-info flex items-center gap-1" style={{ background: 'rgba(14, 165, 233, 0.95)', color: 'white', padding: '4px 10px' }}>
                    <Truck size={12} /> Doorstep Delivery
                  </span>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {pack.farmer && (
                  <div className="flex items-center gap-2 text-xs text-muted" style={{ marginBottom: 8 }}>
                    {pack.farmer.avatar_url ? (
                      <img src={mediaUrl(pack.farmer.avatar_url)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar-placeholder" style={{ width: 22, height: 22, fontSize: '0.65rem' }}>
                        {pack.farmer.farm_name?.[0]}
                      </div>
                    )}
                    <span className="font-bold text-dark">{pack.farmer.farm_name}</span>
                    {pack.farmer.is_verified && <BadgeCheck size={14} color="var(--color-primary-600)" />}
                  </div>
                )}

                <h3 className="text-h4" style={{ marginBottom: 8 }}>{pack.name}</h3>
                <p className="text-sm text-muted line-clamp-2" style={{ marginBottom: 16, minHeight: 40, lineHeight: 1.6 }}>
                  {pack.description || 'Fresh produce bundle carefully curated for your family routine.'}
                </p>

                {pack.items && pack.items.length > 0 && (
                  <div style={{ background: 'var(--color-gray-50)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', marginBottom: 20 }}>
                    <div className="text-xs font-bold text-muted" style={{ marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>INCLUDED THIS WEEK:</div>
                    <div className="text-xs text-dark line-clamp-2" style={{ lineHeight: 1.5 }}>
                      {pack.items.map(i => `${i.product?.name || 'Item'} (${i.quantity} ${i.unit})`).join(' • ')}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                  <div>
                    <span className="text-xs text-muted">Weekly Estimate</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
                      ₹{pack.price.toFixed(2)}
                    </div>
                  </div>

                  <Link to={`/family-packs/${pack.id}`} className="btn btn-primary touch-target" style={{ borderRadius: 'var(--radius-full)', padding: '10px 20px' }}>
                    View Pack <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
