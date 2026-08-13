import { useState, useEffect, useCallback } from 'react'
import {
  Tag, Plus, Search, Edit2, Trash2, EyeOff, Eye, X, Loader2, Ticket,
} from 'lucide-react'
import { adminAPI } from '../../api'
import toast from 'react-hot-toast'

/** Matches the backend's filter names in coupon_service.list_coupons. */
const FILTERS = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'used', label: 'Used' },
  { value: 'expired', label: 'Expired' },
  { value: 'inactive', label: 'Withdrawn' },
]

const STATUS_BADGE = {
  available: { className: 'badge-success', label: 'Available' },
  used: { className: 'badge-info', label: 'Used' },
  expired: { className: 'badge-warning', label: 'Expired' },
  inactive: { className: 'badge-gray', label: 'Withdrawn' },
}

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '',
  max_discount: '',
  expires_at: '',
  is_active: true,
}

/**
 * The admin's coupon console: create single-use codes, and see at a glance
 * which have been redeemed and which are still out there.
 */
export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.coupons({
        status: filter || undefined,
        q: query || undefined,
        per_page: 100,
      })
      setCoupons(data.items || [])
      setSummary(data.summary || null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }, [filter, query])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (coupon) => {
    setEditing(coupon)
    setForm({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_order_value: coupon.min_order_value != null ? String(coupon.min_order_value) : '',
      max_discount: coupon.max_discount != null ? String(coupon.max_discount) : '',
      // <input type="date"> wants YYYY-MM-DD, not a full ISO timestamp.
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      is_active: coupon.is_active,
    })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await adminAPI.updateCoupon(editing.id, form)
        toast.success('Coupon updated')
      } else {
        await adminAPI.createCoupon(form)
        toast.success('Coupon created')
      }
      setShowForm(false)
      fetchCoupons()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save the coupon')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon) => {
    try {
      await adminAPI.updateCoupon(coupon.id, { is_active: !coupon.is_active })
      toast.success(coupon.is_active ? 'Coupon withdrawn' : 'Coupon reactivated')
      fetchCoupons()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update the coupon')
    }
  }

  const remove = async (coupon) => {
    if (!window.confirm(`Delete ${coupon.code}? Nobody has used it, so nothing is lost.`)) return
    try {
      await adminAPI.deleteCoupon(coupon.id)
      toast.success('Coupon deleted')
      fetchCoupons()
    } catch (err) {
      // Used coupons are the record behind a real order; the server refuses
      // and tells the admin to withdraw instead.
      toast.error(err.response?.data?.error || 'Could not delete the coupon')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Coupons</h2>
            <p className="text-sm text-muted" style={{ marginTop: 2 }}>
              Each code can be used once, by one customer
            </p>
          </div>
          <button className="btn btn-primary touch-target" onClick={openCreate}>
            <Plus size={16} /> New coupon
          </button>
        </div>

        {summary && (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <div className="grid-4" style={{ gap: 12 }}>
              <SummaryTile label="Used" value={summary.used} tone="var(--color-info)" />
              <SummaryTile label="Available" value={summary.available} tone="var(--color-primary-600)" />
              <SummaryTile label="Withdrawn" value={summary.unavailable} tone="var(--color-gray-500)" />
              <SummaryTile
                label="Discount given"
                value={`₹${(summary.total_discount_given || 0).toFixed(0)}`}
                tone="var(--color-accent-600)"
              />
            </div>
          </div>
        )}

        <div className="card-body">
          <form
            className="flex gap-3 flex-wrap"
            style={{ marginBottom: 16 }}
            onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()) }}
          >
            <div className="input-icon-wrap" style={{ flex: 1, minWidth: 220 }}>
              <Search size={16} className="icon-left" />
              <input
                className="form-input"
                placeholder="Search a code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value || 'all'}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </form>

          {loading ? (
            <div className="spinner">Loading…</div>
          ) : coupons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Ticket size={28} /></div>
              <h3>{filter ? 'Nothing in this list' : 'No coupons yet'}</h3>
              <p>
                {filter
                  ? 'Try a different filter.'
                  : 'Create a code and share it with your customers.'}
              </p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Limits</th>
                    <th>Status</th>
                    <th>Used by</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const badge = STATUS_BADGE[coupon.status] || STATUS_BADGE.available
                    return (
                      <tr key={coupon.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Tag size={14} color="var(--color-primary-600)" />
                            <span style={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                              {coupon.code}
                            </span>
                          </div>
                          {coupon.description && (
                            <div className="text-xs text-muted">{coupon.description}</div>
                          )}
                        </td>
                        <td>{coupon.label}</td>
                        <td className="text-sm text-muted">
                          {coupon.min_order_value != null && (
                            <div>Min ₹{coupon.min_order_value.toFixed(0)}</div>
                          )}
                          {coupon.expires_at && (
                            <div>Until {new Date(coupon.expires_at).toLocaleDateString()}</div>
                          )}
                          {coupon.min_order_value == null && !coupon.expires_at && '—'}
                        </td>
                        <td>
                          <span className={`badge ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="text-sm">
                          {coupon.is_redeemed ? (
                            <>
                              <div>{coupon.redeemed_by?.full_name || 'A customer'}</div>
                              <div className="text-xs text-muted">
                                {coupon.order
                                  ? `Order #${coupon.order.id} · `
                                  : ''}
                                −₹{(coupon.redeemed_amount || 0).toFixed(2)}
                                {coupon.redeemed_at
                                  ? ` · ${new Date(coupon.redeemed_at).toLocaleDateString()}`
                                  : ''}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">Not used</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                            {/* A redeemed coupon is the record of what a real
                                customer was given, so it is read-only. */}
                            {coupon.is_redeemed ? (
                              <span className="text-xs text-muted">Locked</span>
                            ) : (
                              <>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => openEdit(coupon)}
                                  title="Edit"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => toggleActive(coupon)}
                                  title={coupon.is_active ? 'Withdraw' : 'Reactivate'}
                                >
                                  {coupon.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => remove(coupon)}
                                  title="Delete"
                                  style={{ color: 'var(--color-error)' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
        >
          <div className="modal" style={{ maxWidth: 560 }}>
            <form onSubmit={handleSave}>
              <div className="modal-header">
                <h3>{editing ? 'Edit coupon' : 'New coupon'}</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => setShowForm(false)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input
                    className="form-input"
                    required
                    minLength={3}
                    placeholder="e.g. FRESH50"
                    value={form.code}
                    onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    style={{ letterSpacing: '0.08em', fontWeight: 600 }}
                  />
                  <div className="text-xs text-muted">
                    Not case sensitive — customers can type it either way
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    placeholder="What this coupon is for (admin only)"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discount type</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'percentage', title: 'Percentage', sub: '% off the order' },
                      { value: 'fixed', title: 'Fixed amount', sub: '₹ off the order' },
                    ].map(({ value, title, sub }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, discount_type: value }))}
                        style={{
                          flex: 1, padding: 12, textAlign: 'left', cursor: 'pointer',
                          borderRadius: 'var(--radius-lg)',
                          border: `2px solid ${form.discount_type === value ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                          background: form.discount_type === value ? 'var(--color-primary-50)' : 'white',
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</div>
                        <div className="text-xs text-muted">{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">
                      {form.discount_type === 'percentage' ? 'Percent off *' : 'Amount off (₹) *'}
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      required
                      min="0.01"
                      max={form.discount_type === 'percentage' ? 100 : undefined}
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    />
                  </div>

                  {form.discount_type === 'percentage' && (
                    <div className="form-group">
                      <label className="form-label">Maximum discount (₹)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        value={form.max_discount}
                        onChange={(e) => setForm(f => ({ ...f, max_discount: e.target.value }))}
                      />
                      <div className="text-xs text-muted">Caps the discount on a large order</div>
                    </div>
                  )}
                </div>

                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Minimum order value (₹)</label>
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      value={form.min_order_value}
                      onChange={(e) => setForm(f => ({ ...f, min_order_value: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={form.expires_at}
                      onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  <span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Active</span>
                    <span className="text-xs text-muted" style={{ display: 'block' }}>
                      Turn off to withdraw the code without deleting it
                    </span>
                  </span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 size={16} className="spin" /> : (editing ? 'Save coupon' : 'Create coupon')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value, tone }) {
  return (
    <div style={{
      padding: 14, borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-gray-100)', background: 'var(--color-gray-50)',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: tone, letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
