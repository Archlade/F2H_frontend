import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { farmersAPI } from '../api'
import FarmerCard from '../components/FarmerCard'

export default function FarmersPage() {
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
    <div className="container section-sm">
      <div style={{ marginBottom: 40 }}>
        <h1 className="text-h1">Local Farmers</h1>
        <p className="text-muted" style={{ marginTop: 8 }}>
          Discover {total}+ farmers growing fresh food near you
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
    </div>
  )
}
