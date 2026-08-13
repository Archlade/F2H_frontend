import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../api'

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) {
      toast.error('Enter a valid email address')
      return
    }
    setLoading(true)
    try {
      await authAPI.forgotPassword(email.trim())
      // The API deliberately answers the same way whether or not the account
      // exists, so this screen must not imply anything either.
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-gray-50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: 'white', padding: 40,
        borderRadius: 'var(--radius-xl, 16px)', boxShadow: 'var(--shadow-md, 0 4px 24px rgba(0,0,0,0.06))',
      }}>
        <Link to="/" style={{ display: 'inline-block', marginBottom: 28 }} aria-label="F2H Home">
          <picture>
            <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
            <img src="/f2h-logo-navbar.png" alt="F2H" style={{ height: 36 }} />
          </picture>
        </Link>

        {sent ? (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--color-primary-50, #f0fdf4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <MailCheck size={26} color="var(--color-primary-600, #16a34a)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 10 }}>Check your email</h1>
            <p className="text-muted" style={{ lineHeight: 1.7, marginBottom: 24 }}>
              If an account exists for <strong>{email}</strong>, we've sent a link to reset
              your password. It expires in 1 hour.
            </p>
            <p className="text-sm text-muted" style={{ marginBottom: 28 }}>
              Nothing arrived? Check your spam folder, or{' '}
              <button
                type="button"
                onClick={() => setSent(false)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                         color: 'var(--color-primary-600)', fontWeight: 600, fontSize: 'inherit' }}
              >
                try a different address
              </button>.
            </p>
            <Link to="/auth" className="btn btn-secondary w-full">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Forgot your password?</h1>
            <p className="text-muted text-sm" style={{ marginBottom: 28, lineHeight: 1.7 }}>
              Enter the email address on your account and we'll send you a link to set a new password.
            </p>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Email Address</label>
                <input
                  id="reset-email"
                  className="form-input"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <Link
              to="/auth"
              className="text-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24,
                       color: 'var(--color-gray-600)' }}
            >
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
