import { useState, useEffect } from 'react'
import { mediaUrl } from '../../utils/image'
import { Link } from 'react-router-dom'
import { Plus, Package, Edit, Trash2, CheckCircle, Clock, Leaf } from 'lucide-react'
import { familyPacksAPI } from '../../api'
import toast from 'react-hot-toast'

export default function FarmerFamilyPacks() {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyPacks()
  }, [])

  const fetchMyPacks = async () => {
    setLoading(true)
    try {
      const res = await familyPacksAPI.myPacks()
      setPacks(res.data.items || [])
    } catch {
      toast.error('Failed to load your family packs')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Family Pack?')) return
    try {
      await familyPacksAPI.delete(id)
      toast.success('Family Pack deleted')
      fetchMyPacks()
    } catch {
      toast.error('Failed to delete pack')
    }
  }

  return (
    <div className="section-sm">
      <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 28 }}>
        <div>
          <span className="badge badge-success flex items-center gap-1" style={{ marginBottom: 6 }}>
            <Leaf size={12} /> FARMER MANAGEMENT
          </span>
          <h1 className="text-h2">My Family Packs</h1>
          <p className="text-sm text-muted">Create & manage bundled product packages for doorstep delivery.</p>
        </div>
        <Link to="/farmer/family-packs/new" className="btn btn-primary touch-target flex items-center gap-2 font-bold" style={{ borderRadius: 'var(--radius-full)' }}>
          <Plus size={18} /> Create Family Pack
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />)}
        </div>
      ) : packs.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', padding: '60px 0', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-gray-200)' }}>
          <div className="empty-state__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
            <Package size={32} />
          </div>
          <h3 className="text-h4">No Family Packs Created Yet</h3>
          <p className="text-muted" style={{ maxWidth: 420, margin: '8px auto 20px' }}>
            Bundled packs make it easy for local families to order multiple items in a single weekly delivery.
          </p>
          <Link to="/farmer/family-packs/new" className="btn btn-primary btn-lg touch-target" style={{ borderRadius: 'var(--radius-full)' }}>
            Create Your First Pack
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {packs.map((pack) => (
            <div key={pack.id} className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', border: '1px solid var(--color-gray-200)' }}>
              <div>
                <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
                  <div className="flex items-center gap-3">
                    {pack.banner_image ? (
                      <img src={mediaUrl(pack.banner_image)} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} color="var(--color-gray-400)" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-h4">{pack.name}</h3>
                      <div className="text-xs text-muted">{pack.items?.length || 0} items included</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="font-extrabold text-h4 text-dark">₹{pack.price.toFixed(2)}</div>
                    <span className="text-xs text-muted">per pack</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap" style={{ margin: '14px 0' }}>
                  <span className={`badge ${pack.is_active ? 'badge-success' : 'badge-gray'}`}>
                    {pack.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {pack.is_approved ? (
                    <span className="badge badge-success flex items-center gap-1">
                      <CheckCircle size={12} /> Approved by Admin
                    </span>
                  ) : (
                    <span className="badge badge-warning flex items-center gap-1">
                      <Clock size={12} /> Pending Admin Approval
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between" style={{ paddingTop: 16, borderTop: '1px solid var(--color-gray-100)', marginTop: 12 }}>
                <span className="text-xs text-muted">Created: {new Date(pack.created_at).toLocaleDateString()}</span>
                <div className="flex gap-2">
                  <Link to={`/farmer/family-packs/${pack.id}/edit`} className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                    <Edit size={14} /> Edit
                  </Link>
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDelete(pack.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
