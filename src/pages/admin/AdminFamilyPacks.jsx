import { useState, useEffect } from 'react'
import { adminAPI } from '../../api'
import { Package, CheckCircle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminFamilyPacks() {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.familyPacks()
      setPacks(res.data.items || [])
    } catch {
      toast.error('Failed to load family packs')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveToggle = async (id) => {
    try {
      const res = await adminAPI.approveFamilyPack(id)
      toast.success(res.data.is_approved ? 'Family Pack approved' : 'Family Pack approval revoked')
      fetchPacks()
    } catch {
      toast.error('Failed to update approval')
    }
  }

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 24 }}>
        <span className="badge badge-info flex items-center gap-1" style={{ marginBottom: 6 }}>
          <ShieldCheck size={12} /> MODERATION
        </span>
        <h1 className="text-h2">Admin — Family Packs</h1>
        <p className="text-sm text-muted">Review and approve farmer-created Family Packs for marketplace listing.</p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 250, borderRadius: 20 }} />
      ) : packs.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', padding: '60px 0', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)' }}>
          <div className="empty-state__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <Package size={32} />
          </div>
          <h3 className="text-h4">No Family Packs to Moderation</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packs.map((p) => (
            <div key={p.id} className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)', background: 'white', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
              <div>
                <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
                  <div>
                    <h3 className="text-h4">{p.name}</h3>
                    <div className="text-xs text-muted">Farmer: {p.farmer?.farm_name || p.farmer?.full_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-extrabold text-h4">₹{p.price.toFixed(2)}</div>
                    <span className="text-xs text-muted">{p.items?.length || 0} items</span>
                  </div>
                </div>

                <div className="flex gap-2" style={{ marginBottom: 16 }}>
                  <span className={`badge ${p.is_approved ? 'badge-success' : 'badge-warning'}`}>
                    {p.is_approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end" style={{ paddingTop: 14, borderTop: '1px solid var(--color-gray-100)' }}>
                <button
                  className={`btn btn-sm ${p.is_approved ? 'btn-secondary' : 'btn-primary font-bold'}`}
                  style={{ borderRadius: 'var(--radius-full)' }}
                  onClick={() => handleApproveToggle(p.id)}
                >
                  {p.is_approved ? 'Revoke Approval' : 'Approve Pack'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
