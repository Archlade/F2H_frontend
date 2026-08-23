import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { farmersAPI } from '../api'
import FarmerCard from '../components/FarmerCard'
import { useSeo } from '../utils/seo'

export default function FarmersPage() {
  useSeo('Local Farmers Near You', 'Meet the local farmers growing your food. Browse verified farms near you on F2H Market and order fresh produce direct, with no middlemen taking a cut.')
  const [farmers, setFarmers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 18

  useEffect(() => {
    const fetchFarmers = async () => {
      setLoading(true)
      try {
        let lat, lon
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2000 }))
            lat = pos.coords.latitude; lon = pos.coords.longitude
          } catch {}
        }
        const { data } = await farmersAPI.list({ q: search, page, per_page: PER_PAGE, lat, lon })
        setFarmers(data.items || [])
        setTotal(data.total || 0)
      } catch {
        setFarmers([])
      } finally {
        setLoading(false)
      }
    }
    fetchFarmers()
  }, [search, page])

  return (
    <div className="container section-sm farmers-page">
      <div style={{ marginBottom: 40 }}>
        <h1 className="text-h1">Local Farmers Near You</h1>
        <p className="text-muted" style={{ marginTop: 8, maxWidth: 640, lineHeight: 1.7 }}>
          Meet the farms growing your food. Every farm on F2H Market is verified before
          it can sell, so you can see exactly who grew what arrives at your door — and
          buy from them directly, with no middlemen.
          {total > 0 ? ` ${total} farms listed.` : ''}
        </p>
      </div>

      {/* Search */}
      <div className="input-icon-wrap" style={{ maxWidth: 480, marginBottom: 40 }}>
        <Search size={18} className="icon-left" />
        <input id="farmers-search" className="form-input" placeholder="Search farmers or farm names..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          aria-label="Search farmers" />
      </div>

      {loading ? (
        <div className="grid-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 120 }} />
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skeleton" style={{ height: 40, width: 40, borderRadius: '50%' }} />
                <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '90%', borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : farmers.length > 0 ? (
        <div className="grid-3">
          {farmers.map((f) => <FarmerCard key={f.user_id} farmer={f} />)}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state__icon"><Search size={28} /></div>
          <h3>No farmers found</h3>
          <p>Try a different search or check back soon!</p>
        </div>
      )}

      {/* 15 static words before this — the thinnest public page on the site. */}
      <section style={{ marginTop: 56, paddingTop: 40, borderTop: '1px solid var(--color-gray-200)' }}>
        <h2 className="text-h3" style={{ marginBottom: 14 }}>Buying direct from local farmers</h2>
        <div className="text-sm text-muted" style={{ lineHeight: 1.8, maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p>
            Most vegetables travel through several hands before they reach a shelf, and
            each one takes a margin. On F2H Market you buy from the farm itself — you can
            see who grew your food, what else they have, and what other customers said
            about them.
          </p>
          <p>
            Every farm here is verified by our team before it can sell, and verified farms
            carry a badge on their profile. Farmers are paid in cash when we collect their
            produce, so the money reaches them without waiting on a settlement cycle.
          </p>
          <p>
            Open any farm to see what it has in stock today, or browse{' '}
            <Link to="/products" style={{ color: 'var(--color-primary-700)', fontWeight: 600 }}>all
            fresh produce</Link> across every farm at once.
          </p>
        </div>
      </section>
    </div>
  )
}
