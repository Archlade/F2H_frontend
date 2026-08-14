import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronDown, Filter, Check } from 'lucide-react'
import { productsAPI, categoriesAPI } from '../api'
import ProductCard from '../components/ProductCard'
import { useSeo } from '../utils/seo'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
]

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'white' }}>
      <div className="skeleton" style={{ height: 180 }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 16, width: '80%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 20, width: '30%', borderRadius: 6 }} />
      </div>
    </div>
  )
}

export default function ProductsPage() {
  useSeo('Fresh Vegetables & Groceries Online', 'Browse farm-fresh vegetables, fruit and groceries from local farmers. Compare prices, see what is in season, and get it delivered to your home with cash on delivery.')
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || 'newest',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    is_organic: searchParams.get('is_organic') === 'true',
    delivery_available: searchParams.get('delivery_available') === 'true',
    pickup_available: searchParams.get('pickup_available') === 'true',
    has_discount: searchParams.get('has_discount') === 'true',
  })

  const PER_PAGE = 20

  const fetchProducts = useCallback(async (f = filters, p = page) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: PER_PAGE, sort: f.sort }
      if (f.q) params.q = f.q
      if (f.category) params.category = f.category
      if (f.min_price) params.min_price = f.min_price
      if (f.max_price) params.max_price = f.max_price
      if (f.is_organic) params.is_organic = true
      if (f.delivery_available) params.delivery_available = true
      if (f.pickup_available) params.pickup_available = true
      if (f.has_discount) params.has_discount = true

      // Get user location from browser if sorting by distance
      if (f.sort === 'distance' && navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          )
          params.lat = pos.coords.latitude
          params.lon = pos.coords.longitude
        } catch {}
      }

      const { data } = await productsAPI.list(params)
      setProducts(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    categoriesAPI.list().then(({ data }) => setCategories(data || []))
  }, [])

  useEffect(() => {
    fetchProducts(filters, page)
  }, [filters, page])

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateFilter('q', val), 300)
  }

  const clearFilters = () => {
    setFilters({ q: '', category: '', sort: 'newest', min_price: '', max_price: '', is_organic: false, delivery_available: false, pickup_available: false, has_discount: false })
    setPage(1)
    if (searchRef.current) searchRef.current.value = ''
    setMobileFiltersOpen(false)
  }

  const totalPages = Math.ceil(total / PER_PAGE)
  const hasActiveFilters = filters.category || filters.is_organic || filters.delivery_available ||
    filters.pickup_available || filters.has_discount || filters.min_price || filters.max_price

  // Render Filter Form Controls
  const renderFilterContent = () => (
    <>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Filters</h3>
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm text-sm touch-target" onClick={clearFilters} style={{ color: 'var(--color-error)', padding: '4px 8px' }}>
            <X size={14} /> Clear All
          </button>
        )}
      </div>

      {/* Category */}
      <div className="filter-section">
        <h4>Category</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="flex items-center gap-2 cursor-pointer touch-target" style={{ fontSize: '0.875rem', fontWeight: filters.category === '' ? 600 : 400 }}>
            <input type="radio" name="category" value="" checked={filters.category === ''} onChange={() => updateFilter('category', '')} />
            All Categories
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer touch-target" style={{ fontSize: '0.875rem', fontWeight: filters.category === cat.slug ? 600 : 400 }}>
              <input type="radio" name="category" value={cat.slug} checked={filters.category === cat.slug} onChange={() => updateFilter('category', cat.slug)} />
              {cat.name}
            </label>
          ))}
        </div>
      </div>

      {/* Price */}
      <div className="filter-section">
        <h4>Price Range (₹)</h4>
        <div className="flex gap-2">
          <input className="form-input touch-target" placeholder="Min" type="number" min="0" value={filters.min_price}
            onChange={(e) => updateFilter('min_price', e.target.value)} style={{ padding: '8px 10px' }} />
          <input className="form-input touch-target" placeholder="Max" type="number" min="0" value={filters.max_price}
            onChange={(e) => updateFilter('max_price', e.target.value)} style={{ padding: '8px 10px' }} />
        </div>
      </div>

      {/* Tags */}
      <div className="filter-section">
        <h4>Product Type</h4>
        {[
          { key: 'is_organic', label: 'Organic Only' },
          { key: 'delivery_available', label: 'Delivery Available' },
          { key: 'pickup_available', label: 'Pickup Available' },
          { key: 'has_discount', label: 'On Sale' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer touch-target" style={{ fontSize: '0.875rem', marginBottom: 6 }}>
            <input type="checkbox" checked={filters[key]} onChange={(e) => updateFilter(key, e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
    </>
  )

  return (
    <div className="container section-sm products-page">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-h1">Fresh Products</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>
          {total > 0 ? `${total} products available near you` : 'Discovering fresh products...'}
        </p>
      </div>

      <div className="products-layout-grid">
        {/* Desktop / Laptop Filter Sidebar */}
        <aside className="filter-panel products-filter-sidebar">
          {renderFilterContent()}
        </aside>

        {/* Mobile / Tablet Bottom Sheet Filter Dialog */}
        {mobileFiltersOpen && (
          <div className="modal-overlay" onClick={() => setMobileFiltersOpen(false)}>
            <div className="modal modal-bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3 className="text-h4">Filter Products</h3>
                <button className="btn btn-ghost btn-icon touch-target" onClick={() => setMobileFiltersOpen(false)} aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {renderFilterContent()}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary w-full touch-target" onClick={clearFilters}>Clear</button>
                <button className="btn btn-primary w-full touch-target" onClick={() => setMobileFiltersOpen(false)}>Apply Filters</button>
              </div>
            </div>
          </div>
        )}

        {/* Products Area */}
        <div>
          {/* Search + filter toggle + sort bar */}
          <div className="products-toolbar flex gap-3" style={{ marginBottom: 24 }}>
            <div className="input-icon-wrap" style={{ flex: 1 }}>
              <Search size={18} className="icon-left" />
              <input
                ref={searchRef}
                className="form-input touch-target"
                placeholder="Search products..."
                defaultValue={filters.q}
                onChange={handleSearchChange}
                id="product-search"
                aria-label="Search products"
              />
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              className="btn btn-secondary touch-target products-mobile-filter-btn"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter size={18} />
              <span>Filters</span>
              {hasActiveFilters && <span className="notif-badge__dot" style={{ position: 'static', width: 8, height: 8 }} />}
            </button>

            {/* Sort Select */}
            <div style={{ position: 'relative' }}>
              <select
                className="form-select touch-target"
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                style={{ paddingRight: 32, minWidth: 150 }}
                aria-label="Sort products"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid-auto">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid-auto">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-center gap-2 flex-wrap" style={{ marginTop: 40 }}>
                  <button className="btn btn-secondary btn-sm touch-target" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    const p = i + 1
                    return (
                      <button key={p}
                        className={`btn btn-sm touch-target ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <button className="btn btn-secondary btn-sm touch-target" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state__icon"><Search size={28} /></div>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search query</p>
              <button className="btn btn-secondary touch-target" onClick={clearFilters} style={{ marginTop: 8 }}>
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
