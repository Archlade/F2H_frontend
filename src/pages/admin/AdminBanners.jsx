import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { mediaUrl, IMAGE_ACCEPT } from '../../utils/image'
import toast from 'react-hot-toast'

import { bannersAPI, uploadsAPI, productsAPI, farmersAPI, categoriesAPI, toList } from '../../api'

// Must match AdBannerCarousel.aspectRatio in the app. The preview below is
// exactly this shape, because the whole point of a preview is that art which
// looks right here is not cropped on a phone.
const APP_ASPECT_RATIO = 2

const TARGET_TYPES = [
  { value: 'none', label: 'Nothing — display only' },
  { value: 'product', label: 'A product' },
  { value: 'farmer', label: 'A farm' },
  { value: 'family_pack', label: 'A family pack' },
  { value: 'category', label: 'A category' },
  { value: 'url', label: 'A web page' },
]

// Which target types need something picked from a list, and where that list
// comes from. Keyed by target_type so the form has no branching per type.
// `family_pack` is gone with the feature. Banners already pointing at one still
// carry that target_type in the database — the form shows the raw value rather
// than a picker, and the banner keeps working until an admin repoints it.
const PICKERS = {
  product: { label: 'Product', load: () => productsAPI.list({ per_page: 100 }), name: (r) => r.name },
  farmer: { label: 'Farm', load: () => farmersAPI.list({ per_page: 100 }), name: (r) => r.farm_name || r.full_name },
  category: { label: 'Category', load: () => categoriesAPI.list(), name: (r) => r.name },
}

const EMPTY = {
  title: '',
  image_url: '',
  alt_text: '',
  target_type: 'none',
  target_id: '',
  target_url: '',
  is_active: true,
  starts_at: '',
  ends_at: '',
}

const STATUS_STYLE = {
  live: { background: '#DCFCE7', color: '#166534' },
  scheduled: { background: '#DBEAFE', color: '#1E40AF' },
  expired: { background: '#F1F5F9', color: '#475569' },
  paused: { background: '#FEF3C7', color: '#92400E' },
}

// The API sends ISO with seconds; <input type="datetime-local"> wants exactly
// YYYY-MM-DDTHH:MM and silently ignores anything else.
const toLocalInput = (iso) => (iso ? iso.slice(0, 16) : '')

export default function AdminBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [options, setOptions] = useState([])

  const fetchBanners = useCallback(async () => {
    try {
      const res = await bannersAPI.adminList()
      setBanners((res.data || res).banners || [])
    } catch {
      toast.error('Could not load banners')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBanners() }, [fetchBanners])

  // Reload the picker whenever the target type changes. Kept out of the form
  // state so switching type twice does not leave stale options on screen.
  useEffect(() => {
    const picker = PICKERS[form.target_type]
    if (!picker) { setOptions([]); return }
    let cancelled = false
    picker.load()
      .then((res) => { if (!cancelled) setOptions(toList(res.data || res)) })
      .catch(() => { if (!cancelled) setOptions([]) })
    return () => { cancelled = true }
  }, [form.target_type])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadsAPI.uploadImage(file, 'banners')
      const url = (res.data || res).url
      if (!url) throw new Error('no url')
      set({ image_url: url })
      toast.success('Poster uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      // Cleared so re-picking the same file fires onChange again.
      event.target.value = ''
    }
  }

  const startEdit = (banner) => {
    setEditingId(banner.id)
    setForm({
      title: banner.title || '',
      image_url: banner.image_url || '',
      alt_text: banner.alt_text || '',
      target_type: banner.target_type || 'none',
      target_id: banner.target_id ?? '',
      target_url: banner.target_url || '',
      is_active: banner.is_active,
      starts_at: toLocalInput(banner.starts_at),
      ends_at: toLocalInput(banner.ends_at),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY) }

  const handleSubmit = async (event) => {
    event.preventDefault()
    // Empty strings would fail the backend's date parse; null means "no bound".
    const payload = {
      ...form,
      target_id: form.target_id === '' ? null : Number(form.target_id),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    }
    try {
      if (editingId) {
        await bannersAPI.update(editingId, payload)
        toast.success('Banner updated')
      } else {
        await bannersAPI.create(payload)
        toast.success('Banner created')
      }
      cancelEdit()
      fetchBanners()
    } catch (err) {
      // The backend's messages are written for the admin, so show them rather
      // than a generic failure.
      toast.error(err?.response?.data?.error || 'Could not save the banner')
    }
  }

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete "${banner.title}"? This cannot be undone.`)) return
    try {
      await bannersAPI.remove(banner.id)
      toast.success('Banner deleted')
      if (editingId === banner.id) cancelEdit()
      fetchBanners()
    } catch {
      toast.error('Could not delete the banner')
    }
  }

  const togglePause = async (banner) => {
    try {
      await bannersAPI.update(banner.id, { is_active: !banner.is_active })
      fetchBanners()
    } catch {
      toast.error('Could not change the banner')
    }
  }

  const move = async (index, delta) => {
    const next = [...banners]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setBanners(next)                                   // optimistic
    try {
      await bannersAPI.reorder(next.map((b) => b.id))
    } catch {
      toast.error('Could not reorder')
      fetchBanners()
    }
  }

  const picker = PICKERS[form.target_type]
  const liveCount = useMemo(() => banners.filter((b) => b.status === 'live').length, [banners])

  return (
    <div className="admin-banners">
      <div className="card mb-4">
        <div className="card-header">
          <h2>{editingId ? 'Edit banner' : 'New banner'}</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            Posters shown in the app's home feed, below the hero. Design to a{' '}
            <strong>2:1 ratio</strong> — 1200 × 600 or larger. Anything taller is
            centre-cropped on the phone.
          </p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text" className="form-input" required maxLength={255}
                placeholder="Onam offer — Ravi's farm"
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
              />
              <small className="text-muted">For your reference only. Customers never see it.</small>
            </div>

            <div className="form-group">
              <label className="form-label">Poster</label>
              <input type="file" accept={IMAGE_ACCEPT} className="form-input" onChange={handleUpload} disabled={uploading} />
              {uploading && <small className="text-muted">Uploading…</small>}
            </div>

            {form.image_url && (
              <div className="form-group">
                <label className="form-label">How it will look in the app</label>
                <div style={{
                  aspectRatio: String(APP_ASPECT_RATIO),
                  maxWidth: 420,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,.12)',
                  background: '#F1F5F9',
                }}>
                  <img
                    src={mediaUrl(form.image_url)}
                    alt="Banner preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <small className="text-muted">
                  Cropped exactly as the app crops it. If something important is cut off here, it is cut off there.
                </small>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description for screen readers</label>
              <input
                type="text" className="form-input" maxLength={255}
                placeholder="Onam special: 20% off vegetable boxes from Ravi's farm"
                value={form.alt_text}
                onChange={(e) => set({ alt_text: e.target.value })}
              />
              <small className="text-muted">
                Read aloud to people using VoiceOver or TalkBack, and shown if the image fails to load.
                Describe what the poster says — the whole message is inside the image.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Tapping it opens</label>
              <select className="form-select" value={form.target_type}
                      onChange={(e) => set({ target_type: e.target.value, target_id: '', target_url: '' })}>
                {TARGET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {picker && (
              <div className="form-group">
                <label className="form-label">{picker.label}</label>
                <select className="form-select" required value={form.target_id}
                        onChange={(e) => set({ target_id: e.target.value })}>
                  <option value="">Choose one…</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{picker.name(o)}</option>)}
                </select>
              </div>
            )}

            {form.target_type === 'url' && (
              <div className="form-group">
                <label className="form-label">Web address</label>
                <input
                  type="url" className="form-input" required placeholder="https://example.com/offer"
                  value={form.target_url}
                  onChange={(e) => set({ target_url: e.target.value })}
                />
                <small className="text-muted">Opens in the phone's browser. Must start with http:// or https://.</small>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Starts</label>
                <input type="datetime-local" className="form-input"
                       value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
                <small className="text-muted">Leave blank to start immediately.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Ends</label>
                <input type="datetime-local" className="form-input"
                       value={form.ends_at} onChange={(e) => set({ ends_at: e.target.value })} />
                <small className="text-muted">Leave blank to run until you pause it.</small>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.is_active}
                       onChange={(e) => set({ is_active: e.target.checked })} />
                Active
              </label>
              <small className="text-muted">
                Turn this off to pull a banner instantly, whatever its dates say.
              </small>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={uploading || !form.image_url}>
                {editingId ? 'Save changes' : 'Create banner'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Banners</h2>
          <span className="text-muted" style={{ fontSize: 14 }}>
            {liveCount} showing in the app right now
          </span>
        </div>
        <div className="card-body">
          {loading ? <p>Loading…</p> : banners.length === 0 ? (
            <p className="text-muted">No banners yet. The home screen shows nothing at all until you add one.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Poster</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Runs</th>
                  <th style={{ textAlign: 'right' }}>Seen</th>
                  <th style={{ textAlign: 'right' }}>Tapped</th>
                  <th style={{ textAlign: 'right' }}>Rate</th>
                  <th style={{ width: 220 }}>Order</th>
                </tr>
              </thead>
              <tbody>
                {banners.map((b, i) => (
                  <tr key={b.id}>
                    <td>
                      <img src={mediaUrl(b.image_url)} alt=""
                           style={{ width: 100, aspectRatio: String(APP_ASPECT_RATIO), objectFit: 'cover', borderRadius: 8 }} />
                    </td>
                    <td>
                      <strong>{b.title}</strong>
                      <div className="text-muted" style={{ fontSize: 13 }}>
                        {b.target_type === 'none' ? 'No link'
                          : b.target_type === 'url' ? b.target_url
                          : `Opens a ${b.target_type.replace('_', ' ')}`}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        ...STATUS_STYLE[b.status],
                        padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      }}>{b.status}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {b.starts_at ? new Date(b.starts_at).toLocaleDateString() : 'Now'}
                      {' → '}
                      {b.ends_at ? new Date(b.ends_at).toLocaleDateString() : 'Ongoing'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{b.impressions.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{b.clicks.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{b.ctr == null ? '—' : `${b.ctr}%`}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                        <button className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === banners.length - 1} title="Move down">↓</button>
                        <button className="btn btn-sm" onClick={() => startEdit(b)}>Edit</button>
                        <button className="btn btn-sm" onClick={() => togglePause(b)}>
                          {b.is_active ? 'Pause' : 'Resume'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
