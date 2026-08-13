import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../api'
import { useAuth } from '../context/AuthContext'

// Mirrors the server's rules in backend/app/utils/validators.py so the user
// finds out before submitting.
const MIN_LENGTH = 10

function passwordProblem(pw) {
  if (!pw || pw.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`
  if (pw.length > 128) return 'Password must be 128 characters or fewer'
  if (/^\d+$/.test(pw) || /^[a-zA-Z]+$/.test(pw)) {
    return 'Password must mix letters with numbers or symbols'
  }
  return null
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refetch } = useAuth()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Check the link before showing the form — better than letting someone type
  // a new password and only then learn the link expired.
  useEffect(() => {
    let cancelled = false
    if (!token) {
      setTokenError('This reset link is missing its token. Please request a new one.')
      setChecking(false)
      return
    }
    authAPI
      .verifyResetToken(token)
      .then(({ data }) => {
        if (!cancelled) setEmail(data.email || '')
      })
      .catch((err) => {
        if (!cancelled) {
          setTokenError(
            err.response?.data?.error ||
              'This reset link is invalid or has expired. Please request a new one.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const problem = passwordProblem(password)
    if (problem) return setError(problem)
    if (password !== confirm) return setError('Passwords do not match')

    setError('')
    setSaving(true)
    try {
      const { data } = await authAPI.resetPassword(token, password)
      // The server signs the user in as part of the reset, so pull the session
      // into context rather than sending them back to the login screen.
      await refetch()
      toast.success('Password reset — you\'re signed in')
      const role = data.user?.role
      if (role === 'admin') navigate('/admin')
      else if (role === 'farmer') navigate('/farmer')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset your password. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const card = {
    width: '100%', maxWidth: 440, background: 'white', padding: 40,
    borderRadius: 'var(--radius-xl, 16px)', boxShadow: 'var(--shadow-md, 0 4px 24px rgba(0,0,0,0.06))',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-gray-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
    }}>
      <div style={card}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 28 }} aria-label="F2H Home">
          <picture>
            <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
            <img src="/f2h-logo-navbar.png" alt="F2H" style={{ height: 36 }} />
          </picture>
        </Link>

        {checking ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p className="text-muted text-sm" style={{ marginTop: 16 }}>Checking your link…</p>
          </div>
        ) : tokenError ? (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <AlertCircle size={26} color="#dc2626" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 10 }}>Link no longer valid</h1>
            <p className="text-muted" style={{ lineHeight: 1.7, marginBottom: 28 }}>{tokenError}</p>
            <Link to="/forgot-password" className="btn btn-primary btn-lg w-full">
              Request a new link <ArrowRight size={18} />
            </Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Choose a new password</h1>
            <p className="text-muted text-sm" style={{ marginBottom: 28, lineHeight: 1.7 }}>
              {email ? <>Setting a new password for <strong>{email}</strong>.</> : 'Pick something you haven\'t used before.'}
            </p>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    placeholder={`At least ${MIN_LENGTH} characters`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                             background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="text-xs text-muted" style={{ marginTop: 6, display: 'block' }}>
                  At least {MIN_LENGTH} characters, mixing letters with numbers or symbols.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && <span className="form-error">{error}</span>}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={saving}>
                {saving ? 'Saving…' : 'Reset password'}
                {!saving && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
