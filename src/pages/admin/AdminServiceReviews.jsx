import { useCallback, useEffect, useState } from 'react'
import { Check, Loader, MessageSquare, Star, Trash2, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI } from '../../api'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * What customers said about F2H, and what of it reaches the homepage.
 *
 * Not `/admin/reviews`, which moderates what somebody said about a *product*
 * and affects that farm's rating. Two different things that both got called
 * reviews; this one is the front page.
 *
 * A queue, so pending sorts first — the reason to open this page is the thing
 * nobody has looked at yet.
 */

const FILTERS = [
  ['pending', 'Waiting'],
  ['approved', 'On the homepage'],
  ['', 'All'],
]

function Stars({ n }) {
  return (
    <span className="flex" aria-label={`${n} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= n ? 'var(--color-accent-400)' : 'none'}
          color={i <= n ? 'var(--color-accent-500)' : 'var(--color-gray-300)'}
        />
      ))}
    </span>
  )
}

export default function AdminServiceReviews() {
  usePrivatePageSeo('Service feedback')

  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({})
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await adminAPI.serviceReviews(status ? { status } : {})
      setItems(data.items || [])
      // Counts cover every status regardless of the filter, so the tab labels
      // stay honest while you are looking at one of them.
      setCounts(data.counts || {})
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load feedback')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const toggle = async (row) => {
    setBusyId(row.id)
    try {
      const { data } = await adminAPI.approveServiceReview(row.id)
      toast.success(data.is_approved ? 'Now on the homepage' : 'Taken off the homepage')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update that')
    } finally {
      setBusyId(null)
    }
  }

  const dismiss = async (row) => {
    if (!window.confirm(
      `Delete ${row.full_name}'s feedback?\n\n` +
      'It is removed entirely. They can leave new feedback whenever they like.'
    )) return
    setBusyId(row.id)
    try {
      await adminAPI.deleteServiceReview(row.id)
      toast.success('Deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not delete that')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="section-sm">
      <div style={{ marginBottom: 18 }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={20} />
          <h1 className="text-h2">Service feedback</h1>
        </div>
        <p className="text-sm text-muted">
          What customers think of F2H. Approve one and it appears on the
          homepage under their first name.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 18 }}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${status === value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-full)' }}
            onClick={() => setStatus(value)}
          >
            {label}
            {value === 'pending' && counts.pending ? ` (${counts.pending})` : ''}
            {value === 'approved' && counts.approved ? ` (${counts.approved})` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center p-12" style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
          <h3 className="text-h4">Nothing here</h3>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            {status === 'pending'
              ? 'No feedback waiting. Anything new appears here first.'
              : status === 'approved'
                ? 'Nothing published yet — approve something from Waiting.'
                : 'No customer has left feedback yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((r) => (
            <div key={r.id} className="card" style={{ padding: 18, borderRadius: 'var(--radius-lg)' }}>
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars n={r.rating} />
                    {r.is_approved && (
                      <span className="badge badge-success">on the homepage</span>
                    )}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                    {/* Full name and email here, first name only in public —
                        the queue is where you decide, so it gets the whole
                        record. */}
                    {r.full_name} · {r.email}
                    {r.updated_at && ` · ${new Date(r.updated_at).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              {r.comment && (
                <p className="text-sm" style={{ marginTop: 12, lineHeight: 1.6 }}>
                  “{r.comment}”
                </p>
              )}

              {r.is_approved && r.approved_by && (
                <p className="text-xs text-muted" style={{ marginTop: 8 }}>
                  Approved by {r.approved_by}
                </p>
              )}

              <div className="flex gap-2 flex-wrap" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className={`btn btn-sm touch-target ${r.is_approved ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={busyId === r.id}
                  onClick={() => toggle(r)}
                >
                  {r.is_approved
                    ? <><Undo2 size={14} /> Take off homepage</>
                    : <><Check size={14} /> Show on homepage</>}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost touch-target"
                  disabled={busyId === r.id}
                  onClick={() => dismiss(r)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
