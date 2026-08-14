import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, MapPin, ArrowRight, Leaf, Star, Truck, Users,
  ShoppingBag, CheckCircle, Sprout, Milk, Wheat, Apple,
  Flame, Egg, ChevronRight, Navigation
} from 'lucide-react'
import { productsAPI, farmersAPI, homepageAPI, categoriesAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import ProductCard from '../components/ProductCard'
import FarmerCard from '../components/FarmerCard'
import SellAsFarmerButton from '../components/SellAsFarmerButton'
import toast from 'react-hot-toast'
import { useSeo } from '../utils/seo'

const CATEGORY_ICONS = {
  Vegetables: Leaf, Fruits: Apple, Dairy: Milk, Eggs: Egg,
  Grains: Wheat, Spices: Flame, Meat: ShoppingBag,
  Homemade: Sprout, Seasonal: Star, Honey: Leaf,
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ height: 200, borderRadius: '16px 16px 0 0' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 14, width: '40%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '80%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 14, width: '60%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 22, width: '30%', borderRadius: 6, marginTop: 4 }} />
      </div>
    </div>
  )
}

export default function HomePage() {
  useSeo(null, 'Buy farm-fresh vegetables and groceries online from local farmers near you. Weekly baskets, cash on delivery, no middlemen. F2H Market delivers farm to home.')
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])
  const [farmers, setFarmers] = useState([])
  const [categories, setCategories] = useState([])
  const [homeContent, setHomeContent] = useState({})
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [homepageRes, catsRes] = await Promise.all([
        homepageAPI.get(),
        categoriesAPI.list(),
      ])
      setHomeContent(homepageRes.data || {})
      setCategories(catsRes.data || [])

      // Get user location if logged in
      let lat = null, lon = null
      if (isAuthenticated && navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          )
          lat = pos.coords.latitude
          lon = pos.coords.longitude
          setUserLocation({ lat, lon })
        } catch {}
      }

      const [prodRes, farmRes] = await Promise.all([
        productsAPI.list({ sort: lat ? 'distance' : 'newest', per_page: 8, lat, lon }),
        farmersAPI.list({ per_page: 6, lat, lon }),
      ])
      setProducts(prodRes.data.items || [])
      setFarmers(farmRes.data.items || [])
    } catch (err) {
      console.error('Failed to load homepage:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (e) => {
    e.preventDefault()
    navigate(`/products?q=${encodeURIComponent(searchQuery)}`)
  }

  const heroSection = homeContent?.hero || {}
  const nearbySection = homeContent?.nearby_products || {}
  const featuredFarmersSection = homeContent?.featured_farmers || {}
  const featuredFarmers = homeContent?.featured_farmers_data || []
  const featuredProductsSection = homeContent?.featured_products || {}
  const featuredProducts = homeContent?.featured_products_data || []

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            {/* Left */}
            <div className="hero__content">
              <div className="hero__badge">
                <Sprout size={14} />
                Farm-to-Table Marketplace
              </div>

              <h1 className="hero__title">
                {heroSection.title ? (
                  <>
                    {heroSection.title.split('.')[0]}.<br />
                    <span>{heroSection.title.split('.').slice(1).join('.').trim()}</span>
                  </>
                ) : (
                  <>Fresh from the farm.<br /><span>Direct to you.</span></>
                )}
              </h1>

              <p className="hero__subtitle">
                {heroSection.subtitle || 'Discover and purchase fresh produce directly from local farmers near you. No middlemen — just real food from real people.'}
              </p>

              <form className="hero__search" onSubmit={handleSearch}>
                <MapPin size={18} color="var(--color-gray-400)" style={{ flexShrink: 0 }} />
                <input
                  id="hero-search"
                  type="text"
                  placeholder="Search for fresh vegetables, fruits, dairy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search products"
                />
                <button type="submit">Search</button>
              </form>

              <div className="hero__ctas">
                <Link to="/products" className="btn btn-primary btn-lg">
                  Browse Products <ArrowRight size={18} />
                </Link>
                <SellAsFarmerButton className="btn btn-secondary btn-lg">
                  <Sprout size={18} /> Sell as Farmer
                </SellAsFarmerButton>
              </div>

              {/* Stats */}
              <div className="home-hero-stats">
                {[
                  { label: 'Active Farmers', value: '200+' },
                  { label: 'Fresh Products', value: '1,500+' },
                  { label: 'Happy Customers', value: '5,000+' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)', letterSpacing: '-0.04em' }}>{value}</div>
                    <div className="text-xs text-muted font-medium">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right image */}
            <div className="hero__image">
              <div style={{
                width: '100%',
                aspectRatio: '4/5',
                borderRadius: 'var(--radius-2xl)',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 40%, #fef3c7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-2xl)',
              }}>
                {/* Decorative floating cards */}
                <div style={{
                  position: 'absolute', top: 40, left: 20,
                  background: 'white', borderRadius: 'var(--radius-xl)',
                  padding: '16px 20px', boxShadow: 'var(--shadow-xl)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Leaf size={20} color="var(--color-primary-600)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>Fresh Today</div>
                    <div style={{ fontWeight: 800, color: 'var(--color-gray-900)' }}>Organic Tomatoes</div>
                  </div>
                </div>

                <div style={{
                  position: 'absolute', bottom: 60, right: 20,
                  background: 'white', borderRadius: 'var(--radius-xl)',
                  padding: '16px 20px', boxShadow: 'var(--shadow-xl)',
                }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="var(--color-accent-400)" color="var(--color-accent-400)" />)}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.9375rem' }}>4.9/5 rating</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>from 2,400+ reviews</div>
                </div>

                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: '5rem', marginBottom: 16 }}>🌿</div>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-800)' }}>
                    Farm Fresh
                  </div>
                  <div style={{ color: 'var(--color-gray-500)', marginTop: 8 }}>100% Natural Products</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES ═══ */}
      <section className="section-sm" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-header__left">
              <div className="section-label">Browse</div>
              <h2 className="text-h2">Shop by Category</h2>
            </div>
            <Link to="/products" className="btn btn-secondary btn-sm">
              All Products <ChevronRight size={14} />
            </Link>
          </div>

          <div className="home-category-grid">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.name] || Leaf
              return (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="home-category-grid__item"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    padding: '20px 12px', borderRadius: 'var(--radius-xl)', textAlign: 'center',
                    border: '1.5px solid var(--color-gray-100)', background: 'var(--color-gray-50)',
                    transition: 'all 0.2s', cursor: 'pointer', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-300)'; e.currentTarget.style.background = 'var(--color-primary-50)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-gray-100)'; e.currentTarget.style.background = 'var(--color-gray-50)'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'var(--color-primary-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color="var(--color-primary-600)" />
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-700)', lineHeight: 1.3 }}>
                    {cat.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ NEARBY PRODUCTS ═══ */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-header__left">
              <div className="section-label">
                {userLocation ? <><Navigation size={12} style={{ display: 'inline', marginRight: 4 }} /> Near You</> : 'Discover'}
              </div>
              <h2 className="text-h2">{nearbySection.title || 'Fresh Near You'}</h2>
              <p className="text-body text-muted" style={{ marginTop: 8 }}>
                {nearbySection.subtitle || 'Products from local farmers available for delivery or pickup'}
              </p>
            </div>
            <Link to="/products" className="btn btn-secondary btn-sm">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid-auto">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid-auto">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon"><ShoppingBag size={28} /></div>
              <h3>No products yet</h3>
              <p>Be the first farmer to list your products!</p>
              <SellAsFarmerButton className="btn btn-primary" style={{ marginTop: 8 }}>
                Start Selling
              </SellAsFarmerButton>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FEATURED FARMERS ═══ */}
      {featuredFarmers.length > 0 && (
        <section className="section" style={{ background: 'white' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-header__left">
                <div className="section-label">Featured</div>
                <h2 className="text-h2">{featuredFarmersSection.title || 'Featured Farmers'}</h2>
              </div>
              <Link to="/farmers" className="btn btn-secondary btn-sm">
                All Farmers <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid-3 home-swipe-row">
              {featuredFarmers.map((ff) => (
                <FarmerCard key={ff.farmer_id} farmer={ff.farmer} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ FEATURED PRODUCTS ═══ */}
      {featuredProducts.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div className="section-header__left">
                <div className="section-label">Hand-Picked</div>
                <h2 className="text-h2">{featuredProductsSection.title || 'Featured Products'}</h2>
              </div>
              <Link to="/products" className="btn btn-secondary btn-sm">
                Shop Now <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid-auto">
              {featuredProducts.map((fp) => fp.product && <ProductCard key={fp.product_id} product={fp.product} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section home-how-it-works" style={{ background: 'linear-gradient(135deg, var(--color-gray-900), var(--color-gray-850))' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label" style={{ color: 'var(--color-primary-400)' }}>Simple Process</div>
            <h2 className="text-h2" style={{ color: 'white' }}>How F2H Works</h2>
          </div>

          <div className="grid-2" style={{ gap: 48 }}>
            {/* Customers */}
            <div>
              <div style={{ color: 'var(--color-primary-400)', fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>
                For Customers
              </div>
              {[
                { step: '01', title: 'Discover', desc: 'Find fresh products from local farmers near your location.' },
                { step: '02', title: 'Request', desc: 'Send a purchase request with your preferred delivery method.' },
                { step: '03', title: 'Connect', desc: 'Once accepted, chat directly with your farmer.' },
                { step: '04', title: 'Receive', desc: 'Get your fresh produce delivered or picked up from the farm.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4" style={{ marginBottom: 28 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-primary-400)', fontWeight: 800, fontSize: '0.875rem',
                  }}>{step}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', marginBottom: 4 }}>{title}</div>
                    <div style={{ color: 'var(--color-gray-400)', fontSize: '0.9375rem' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Farmers */}
            <div>
              <div style={{ color: 'var(--color-accent-400)', fontWeight: 700, fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 24 }}>
                For Farmers
              </div>
              {[
                { step: '01', title: 'List', desc: 'Create your farm profile and list your fresh products with prices.' },
                { step: '02', title: 'Accept', desc: 'Review and accept purchase requests from nearby customers.' },
                { step: '03', title: 'Connect', desc: 'Chat with customers to coordinate delivery or pickup.' },
                { step: '04', title: 'Sell', desc: 'Earn fair prices directly from customers, no middlemen.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-4" style={{ marginBottom: 28 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-accent-400)', fontWeight: 800, fontSize: '0.875rem',
                  }}>{step}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', marginBottom: 4 }}>{title}</div>
                    <div style={{ color: 'var(--color-gray-400)', fontSize: '0.9375rem' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHY DIRECT ═══ */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">Benefits</div>
            <h2 className="text-h2">Why Buy Direct?</h2>
          </div>
          <div className="grid-4">
            {[
              { icon: Leaf, title: 'Ultra Fresh', desc: 'Harvested and delivered within hours, not days. Maximum nutrition and flavor.', color: 'var(--color-primary-100)', iconColor: 'var(--color-primary-600)' },
              { icon: Users, title: 'Support Farmers', desc: 'Every purchase goes directly to the farmer — fair prices, fair income.', color: '#dbeafe', iconColor: '#1d4ed8' },
              { icon: CheckCircle, title: 'Full Transparency', desc: 'Know exactly where your food comes from. Meet your farmer personally.', color: '#ede9fe', iconColor: '#5b21b6' },
              { icon: Truck, title: 'Flexible Delivery', desc: 'Choose doorstep delivery or farm pickup — on your schedule.', color: 'var(--color-accent-100)', iconColor: 'var(--color-accent-700)' },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className="card" style={{ border: 'none', boxShadow: 'var(--shadow-card)', borderRadius: 'var(--radius-xl)' }}>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} color={iconColor} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 8 }}>{title}</h3>
                    <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FARMERS NEAR YOU ═══ */}
      {farmers.length > 0 && (
        <section className="section" style={{ background: 'var(--color-gray-50)' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-header__left">
                <div className="section-label">Local</div>
                <h2 className="text-h2">Farmers Near You</h2>
              </div>
              <Link to="/farmers" className="btn btn-secondary btn-sm">
                View All <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid-3 home-swipe-row">
              {farmers.slice(0, 3).map((f) => <FarmerCard key={f.user_id} farmer={f} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CTA BANNER ═══ */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))',
        padding: '80px 0',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-label" style={{ color: 'var(--color-primary-300)' }}>Join F2H Today</div>
          <h2 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: '-0.02em' }}>
            Start your farm-fresh journey
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.125rem', marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
            Join thousands of customers buying directly from local farmers for fresher, healthier food.
          </p>
          <div className="flex flex-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/auth?mode=register" className="btn btn-lg"
              style={{ background: 'white', color: 'var(--color-primary-700)', fontWeight: 700 }}>
              Get Started Free
            </Link>
            <SellAsFarmerButton className="btn btn-lg"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)' }}>
              <Sprout size={18} /> Become a Farmer
            </SellAsFarmerButton>
          </div>
        </div>
      </section>
    </div>
  )
}
