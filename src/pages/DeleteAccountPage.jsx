import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { authAPI } from '../api'
import { useAuth } from '../context/AuthContext'

/**
 * Deleting your account.
 *
 * Google Play requires an in-app route to account deletion for any app offering
 * account creation, *and* a publicly reachable web page besides — this is that
 * page. It is deliberately reachable while signed out: the policy is that
 * somebody who has uninstalled the app must still be able to find out how to
 * delete their data.
 *
 * Signed in, it shows the form. Signed out, it explains what deletion does and
 * where to sign in — rather than bouncing to a login screen with no
 * explanation, which is the version that fails review.
 */
export default function DeleteAccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState(null)
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    authAPI.deleteAccountStatus()
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ can_delete: false, blocker: 'Could not check your account just now.' }))
  }, [user])

  const submit = async (e) => {
    e.preventDefault()
    if (!password) return toast.error('Enter your password to continue')

    // Typed confirmation rather than a dialog. This is irreversible, and a
    // second click is a much weaker signal than a second decision.
    if (!window.confirm(
      'Delete your account permanently?\n\n' +
      'Your name, email, phone number and saved addresses will be removed. ' +
      'This cannot be undone.'
    )) return

    setBusy(true)
    try {
      await authAPI.deleteAccount({ password, reason })
      toast.success('Your account has been deleted')
      await logout()
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not delete your account')
      setBusy(false)
    }
  }

  return (
    <div className="section-sm" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 className="text-h2" style={{ marginBottom: 6 }}>Delete your F2H account</h1>
      <p className="text-sm text-muted" style={{ marginBottom: 24 }}>
        This removes your personal information from F2H permanently.
      </p>

      <div className="card" style={{
        padding: 16, marginBottom: 20, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-error-bg, #FEF2F2)', border: '1px solid var(--color-error, #DC2626)',
      }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} style={{ color: 'var(--color-error, #DC2626)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--color-error, #DC2626)' }}>
            Deleting your account is permanent. It cannot be undone, and the same
            email address cannot be used to sign in again.
          </p>
        </div>
      </div>

      <h2 className="text-h4" style={{ marginBottom: 8 }}>What is removed</h2>
      <ul className="text-sm text-muted" style={{ paddingLeft: 18, marginBottom: 20, lineHeight: 1.8 }}>
        <li>Your name, email address and phone number</li>
        <li>Your saved delivery addresses and locations</li>
        <li>Your profile photo, and your farm details if you sell on F2H</li>
        <li>Push notification registrations on every device</li>
      </ul>

      <h2 className="text-h4" style={{ marginBottom: 8 }}>What is kept</h2>
      <ul className="text-sm text-muted" style={{ paddingLeft: 18, marginBottom: 24, lineHeight: 1.8 }}>
        {/* Said plainly rather than buried. Deletion makes you unidentifiable,
            which is what is being asked for — but a past order is also the
            other party's record of a real transaction, and discovering that
            afterwards feels like a broken promise. */}
        <li>
          Completed orders, with your name removed — the farmer or customer on the
          other side of each order keeps their own record of it
        </li>
      </ul>

      {!user ? (
        <div className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ marginBottom: 12 }}>
            Please sign in to delete your account. If you can no longer sign in,
            email <a href="mailto:support@f2hmarket.com" style={{ fontWeight: 600 }}>
            support@f2hmarket.com</a> from the address on the account and we will
            delete it for you.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/auth')}>
            Sign in
          </button>
        </div>
      ) : status?.blocker ? (
        <div className="card flex items-start gap-3" style={{
          padding: 16, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-accent-50, #FFFBEB)',
          border: '1px solid var(--color-accent-200, #FDE68A)',
        }}>
          <Clock size={18} style={{ color: 'var(--color-accent-800, #92400E)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--color-accent-800, #92400E)' }}>
            {status.blocker}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Confirm your password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="form-label">Why are you leaving? (optional)</label>
            <textarea
              className="form-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="This helps us improve F2H"
            />
          </div>
          <button type="submit" className="btn btn-error" disabled={busy}>
            <Trash2 size={15} /> {busy ? 'Deleting…' : 'Delete my account'}
          </button>
        </form>
      )}
    </div>
  )
}
