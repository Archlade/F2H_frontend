import { useState } from 'react'
import { Leaf, X, Info, Loader2 } from 'lucide-react'
import { authAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

/**
 * "Sell as a farmer" for a customer who is already signed in.
 *
 * The plain link version pointed at `/auth?mode=register&role=farmer`, which
 * the route guard redirects signed-in users away from — so the button did
 * nothing. This upgrades the existing account instead, which also keeps their
 * order history rather than stranding it on a second login.
 */
export default function BecomeFarmerModal({ open, onClose, onDone }) {
  const { refetch } = useAuth()
  const [form, setForm] = useState({ farm_name: '', farming_type: '', bio: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  if (!open) return null

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.farm_name.trim()) { setError('Farm name is required'); return }

    setSaving(true)
    setError(null)
    try {
      await authAPI.becomeFarmer(form)
      // Re-reads /auth/me so the navbar, guards and menus switch to the
      // farmer versions without a reload.
      await refetch()
      toast.success('Your farm account is ready')
      onClose?.()
      onDone?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create your farm account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <form onSubmit={submit}>
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-50)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Leaf size={20} color="var(--color-primary-600)" />
              </div>
              <h3>Start selling on F2H</h3>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="text-sm text-muted">
              Your account becomes a farm account. Your existing orders, addresses
              and messages stay exactly as they are.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="farm-name">Farm name *</label>
              <input
                id="farm-name"
                className="form-input"
                required
                autoFocus
                placeholder="e.g. Green Valley Organics"
                value={form.farm_name}
                onChange={(e) => update('farm_name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="farming-type">Farming type</label>
              <input
                id="farming-type"
                className="form-input"
                placeholder="e.g. Organic, Natural, Mixed"
                value={form.farming_type}
                onChange={(e) => update('farming_type', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="farm-bio">Short bio</label>
              <textarea
                id="farm-bio"
                className="form-textarea"
                rows={2}
                placeholder="One or two lines shown on your farm card"
                value={form.bio}
                onChange={(e) => update('bio', e.target.value)}
              />
            </div>

            <div style={{
              display: 'flex', gap: 8, padding: 12,
              background: 'var(--color-accent-50)', borderRadius: 'var(--radius-md)',
            }}>
              <Info size={16} color="var(--color-accent-700)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span className="text-xs" style={{ color: 'var(--color-accent-800)' }}>
                An admin verifies new farms before the verified badge appears.
              </span>
            </div>

            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="spin" /> : 'Create my farm account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
