import { useEffect, useState } from 'react'
import { BikeIcon, IndianRupee, Loader, Plus, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

import { adminAPI } from '../../api'
import { usePrivatePageSeo } from '../../utils/seo'

/**
 * Delivery partners, and the cash they are holding.
 *
 * Two things on one page because they are two views of the same people, and
 * splitting them would mean navigating between "who works here" and "who owes
 * me money" to answer one question.
 *
 * The cash figures come from the server and are not recomputed here. Collected
 * is derived from completed orders, handed over is the sum of recorded
 * handovers, and outstanding is the subtraction — doing that arithmetic again
 * in the browser is how a page comes to disagree with the API it is showing.
 */

const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function AdminDelivery() {
  usePrivatePageSeo('Delivery')

  const [partners, setPartners] = useState([])
  const [cash, setCash] = useState({ partners: [], totals: {} })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Which partner's handover form is open, and what is typed in it.
  const [remitFor, setRemitFor] = useState(null)
  const [remitAmount, setRemitAmount] = useState('')
  const [remitNote, setRemitNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      // Both at once — the page is useless with half of it, and two spinners
      // resolving separately makes the table jump.
      const [p, c] = await Promise.all([adminAPI.deliveryPartners(), adminAPI.deliveryCash()])
      setPartners(p.data || [])
      setCash(c.data || { partners: [], totals: {} })
    } catch {
      toast.error('Could not load delivery partners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await adminAPI.createDeliveryPartner(form)
      toast.success(`${form.first_name} can now sign in to the app`)
      setForm({ first_name: '', last_name: '', email: '', phone: '', password: '' })
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create that account')
    } finally {
      setCreating(false)
    }
  }

  const remit = async (e) => {
    e.preventDefault()
    const amount = Number(remitAmount)
    if (!Number.isFinite(amount) || amount === 0) {
      return toast.error('Enter an amount other than zero')
    }
    setSaving(true)
    try {
      await adminAPI.recordRemittance(remitFor.delivery_id, { amount, note: remitNote })
      toast.success(`Recorded ${money(amount)} from ${remitFor.full_name}`)
      setRemitFor(null); setRemitAmount(''); setRemitNote('')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not record that')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader className="animate-spin" /></div>
  }

  const totals = cash.totals || {}

  return (
    <div className="section-sm">
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 6 }}>
        <div>
          <h1 className="text-h2">Delivery</h1>
          <p className="text-sm text-muted">
            Partners who carry orders from the store room, and the cash they hold.
          </p>
        </div>
        <button type="button" className="btn btn-primary touch-target"
                onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add partner'}
        </button>
      </div>

      {/* ── Create ────────────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={create} className="card"
              style={{ padding: 24, borderRadius: 'var(--radius-2xl)', marginTop: 16, maxWidth: 640 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <Users size={18} className="text-muted" />
            <h2 className="text-h4">New delivery partner</h2>
          </div>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
            There is no signup for this role. The account can see customers'
            addresses and phone numbers for the orders it carries, so it is
            created here rather than claimed by whoever finds the form.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              ['first_name', 'First name', 'text'],
              ['last_name', 'Last name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone (10 digits)', 'tel'],
            ].map(([key, label, type]) => (
              <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor={`dp-${key}`}>{label}</label>
                <input
                  id={`dp-${key}`} className="form-input touch-target" type={type} required
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label" htmlFor="dp-password">Password</label>
            <input
              id="dp-password" className="form-input touch-target" type="text" required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
            {/*
              Shown as plain text on purpose. No email is sent — the mail
              service is not configured — so the admin has to read this out or
              write it down, and a row of dots cannot be passed on.
            */}
            <small className="text-muted" style={{ display: 'block', marginTop: 6 }}>
              Give this to them directly. No email is sent.
            </small>
          </div>

          <button type="submit" className="btn btn-primary touch-target"
                  style={{ marginTop: 18 }} disabled={creating}>
            {creating ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}

      {/* ── Cash summary ──────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', marginTop: 20 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <Wallet size={18} className="text-muted" />
          <h2 className="text-h4">Cash held</h2>
        </div>
        <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
          Collected is the total of each partner's completed orders. Handed over
          is what you have recorded receiving. The difference is what they are
          still carrying.
        </p>

        <div className="flex gap-3 flex-wrap" style={{ marginBottom: 18 }}>
          {[
            ['Collected', totals.collected, 'var(--color-gray-700)'],
            ['Handed over', totals.handed_over, 'var(--color-gray-700)'],
            ['Outstanding', totals.outstanding, 'var(--color-primary-700)'],
          ].map(([label, value, colour]) => (
            <div key={label} style={{
              flex: '1 1 150px', padding: '12px 16px',
              background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)',
            }}>
              <div className="text-xs text-muted">{label}</div>
              <div className="text-h4" style={{ color: colour }}>{money(value)}</div>
            </div>
          ))}
        </div>

        {cash.partners.length === 0 ? (
          <p className="text-sm text-muted">No delivery partners yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: 640 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Partner</th>
                  <th style={{ textAlign: 'left' }}>Phone</th>
                  <th style={{ textAlign: 'right' }}>Collected</th>
                  <th style={{ textAlign: 'right' }}>Handed over</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cash.partners.map((p) => (
                  <tr key={p.delivery_id}>
                    <td>
                      {p.full_name}
                      {!p.is_active && <span className="badge badge-warning" style={{ marginLeft: 8 }}>inactive</span>}
                    </td>
                    <td className="text-muted">{p.phone || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{money(p.collected)}</td>
                    <td style={{ textAlign: 'right' }}>{money(p.handed_over)}</td>
                    <td style={{
                      textAlign: 'right', fontWeight: 700,
                      // Negative means they have handed over more than they
                      // collected. Shown rather than clamped — it is an error
                      // worth seeing, not a number worth hiding.
                      color: p.outstanding > 0 ? 'var(--color-primary-700)'
                           : p.outstanding < 0 ? 'var(--color-error)'
                           : 'var(--color-gray-500)',
                    }}>
                      {money(p.outstanding)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-secondary btn-sm"
                              onClick={() => { setRemitFor(p); setRemitAmount(String(p.outstanding > 0 ? p.outstanding : '')) }}>
                        <IndianRupee size={13} /> Record handover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record a handover ─────────────────────────────────────────────── */}
      {remitFor && (
        <form onSubmit={remit} className="card"
              style={{ padding: 24, borderRadius: 'var(--radius-2xl)', marginTop: 20, maxWidth: 560 }}>
          <h2 className="text-h4" style={{ marginBottom: 6 }}>
            Cash received from {remitFor.full_name}
          </h2>
          <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 18 }}>
            Prefilled with what they are currently holding. Change it if they
            handed over a different amount — a part payment is fine.
            {' '}
            <strong>To correct a mistake, record a negative amount</strong> rather
            than trying to edit the original; the trail keeps both.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="remit-amount">Amount</label>
            <input id="remit-amount" className="form-input touch-target" type="number"
                   step="0.01" inputMode="decimal" required
                   value={remitAmount} onChange={(e) => setRemitAmount(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="remit-note">Note (optional)</label>
            <input id="remit-note" className="form-input touch-target" type="text"
                   value={remitNote} onChange={(e) => setRemitNote(e.target.value)}
                   placeholder="e.g. evening handover, correction for 25 Aug" />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button type="submit" className="btn btn-primary touch-target" disabled={saving}>
              {saving ? 'Recording…' : 'Record handover'}
            </button>
            <button type="button" className="btn btn-ghost touch-target"
                    onClick={() => { setRemitFor(null); setRemitAmount(''); setRemitNote('') }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Partners ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 24, borderRadius: 'var(--radius-2xl)', marginTop: 20 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
          <BikeIcon size={18} className="text-muted" />
          <h2 className="text-h4">Partners</h2>
        </div>

        {partners.length === 0 ? (
          <p className="text-sm text-muted">
            None yet. Add one above — they sign in to the F2H app with the email
            and password you set, and see only the orders you assign them.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {partners.map((p) => (
              <div key={p.id} className="flex items-center justify-between flex-wrap gap-2"
                   style={{ padding: '10px 14px', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <div className="font-bold text-dark">{p.full_name}</div>
                  <div className="text-xs text-muted">{p.email} · {p.phone || 'no phone'}</div>
                </div>
                <div className="text-sm text-muted">
                  {p.active_orders} order{p.active_orders === 1 ? '' : 's'} in hand
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
