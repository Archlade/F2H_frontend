import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Leaf, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { emailProblem, phoneProblem } from '../utils/validators'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login, register, isAuthenticated } = useAuth()

  const defaultMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const defaultRole = searchParams.get('role') === 'farmer' ? 'farmer' : 'customer'

  const [mode, setMode] = useState(defaultMode)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: defaultRole,
    farm_name: '',
  })

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    // Mirrors the server's email_problem(). An '@' test accepted 'a@b',
    // which the server now refuses — so the browser said yes and the API
    // said no.
    const emailIssue = emailProblem(form.email)
    if (emailIssue) e.email = emailIssue

    if (mode === 'register') {
      // These mirror the server's password_problem() and phone_problem(). They
      // used to say 8 characters while the server required 10, so a password
      // could pass here and be rejected on submit.
      if (form.password.length < 10) {
        e.password = 'Password must be at least 10 characters'
      } else if (/^[A-Za-z]+$/.test(form.password) || /^[0-9]+$/.test(form.password)) {
        e.password = 'Mix letters with numbers or symbols'
      }

      if (!form.first_name.trim()) e.first_name = 'First name is required'
      if (!form.last_name.trim()) e.last_name = 'Last name is required'
      if (form.role === 'farmer' && !form.farm_name.trim()) e.farm_name = 'Farm name is required'

      // Required: it is how a farmer reaches a customer at handover.
      // Mirrors the server's phone_problem(). Was 7-15 digits, which let
      // typos through; an unreachable number under cash on delivery is a
      // driver outside a building with no way to be let in.
      const phoneIssue = phoneProblem(form.phone)
      if (phoneIssue) e.phone = phoneIssue
    } else if (!form.password) {
      e.password = 'Enter your password'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await login(form.email, form.password)
        toast.success(`Welcome back, ${user.first_name}!`)
        if (user.role === 'admin') navigate('/admin')
        else if (user.role === 'farmer') navigate('/farmer')
        else navigate('/dashboard')
      } else {
        const user = await register(form)
        toast.success(`Welcome to F2H, ${user.first_name}!`)
        if (user.role === 'farmer') navigate('/farmer')
        else navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-grid" style={{ minHeight: '100vh', background: 'var(--color-gray-50)' }}>
      {/* Left panel */}
      <div className="auth-left-panel" style={{
        background: 'linear-gradient(135deg, var(--color-primary-800) 0%, var(--color-primary-600) 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 60, position: 'relative' }} aria-label="F2H Home">
          <picture>
            <source srcSet="/f2h-logo-darkbg.webp" type="image/webp" />
            <img
              src="/f2h-logo-darkbg.png"
              alt="F2H - Farmers to Home"
              className="f2h-logo-img f2h-logo-img--auth"
            />
          </picture>
        </Link>

        <div style={{ position: 'relative' }}>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            {mode === 'login' ? 'Welcome back to\nfarm-fresh food.' : 'Join the farm-fresh\nrevolution.'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: 40 }}>
            {mode === 'login'
              ? 'Sign in to discover fresh products from local farmers near you.'
              : 'Connect directly with local farmers for the freshest food at fair prices.'}
          </p>

          {[
            'Fresh produce directly from farms',
            'No middlemen — fair prices always',
            'Real-time chat with your farmer',
            'Delivery or farm pickup options',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3" style={{ marginBottom: 14 }}>
              <CheckCircle size={18} color="rgba(255,255,255,0.8)" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="auth-form-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mode tabs */}
          <div style={{
            display: 'flex', background: 'var(--color-gray-100)', borderRadius: 'var(--radius-lg)',
            padding: 4, marginBottom: 32,
          }}>
            {['login', 'register'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setErrors({}) }}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-md)',
                  fontWeight: 600, fontSize: '0.9375rem', transition: 'all 0.2s',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  border: 'none', cursor: 'pointer',
                }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="text-muted text-sm" style={{ marginBottom: 28 }}>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button className="text-primary font-semibold" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}) }}>
              {mode === 'login' ? 'Register here' : 'Sign in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'register' && (
              <>
                {/* Role selection */}
                <div className="form-group">
                  <label className="form-label">I want to...</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'customer', label: 'Buy fresh food', emoji: '🛒' },
                      { value: 'farmer', label: 'Sell my produce', emoji: '🌾' },
                    ].map(({ value, label, emoji }) => (
                      <button key={value} type="button"
                        onClick={() => update('role', value)}
                        style={{
                          flex: 1, padding: '12px', border: `2px solid ${form.role === value ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                          borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all 0.2s',
                          background: form.role === value ? 'var(--color-primary-50)' : 'white',
                          color: form.role === value ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                          fontWeight: 600, fontSize: '0.875rem',
                        }}>
                        <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{emoji}</div>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="first-name">First Name</label>
                    <input id="first-name" className="form-input" placeholder="John" value={form.first_name}
                      onChange={(e) => update('first_name', e.target.value)} autoComplete="given-name" />
                    {errors.first_name && <span className="form-error">{errors.first_name}</span>}
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="last-name">Last Name</label>
                    <input id="last-name" className="form-input" placeholder="Smith" value={form.last_name}
                      onChange={(e) => update('last_name', e.target.value)} autoComplete="family-name" />
                    {errors.last_name && <span className="form-error">{errors.last_name}</span>}
                  </div>
                </div>

                {form.role === 'farmer' && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="farm-name">Farm Name</label>
                    <input id="farm-name" className="form-input" placeholder="Green Valley Farm" value={form.farm_name}
                      onChange={(e) => update('farm_name', e.target.value)} />
                    {errors.farm_name && <span className="form-error">{errors.farm_name}</span>}
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input id="email" className="form-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <label className="form-label" htmlFor="password">Password</label>
                {mode === 'login' && (
                  <Link
                    to={form.email ? `/forgot-password?email=${encodeURIComponent(form.email)}` : '/forgot-password'}
                    className="text-sm"
                    style={{ color: 'var(--color-primary-600)', fontWeight: 600 }}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input id="password" className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min. 10 characters' : 'Enter password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 44 }}
                />
                <button type="button"
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone *</label>
                <input id="phone" className="form-input" type="tel" required placeholder="+91 98765 43210"
                  value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" />
                <span className="text-xs text-muted">
                  So farmers can reach you about deliveries
                </span>
                {errors.phone && <span className="form-error">{errors.phone}</span>}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 20 }}>
            By continuing, you agree to our{' '}
            <a href="#" style={{ color: 'var(--color-primary-600)' }}>Terms of Service</a> and{' '}
            <a href="#" style={{ color: 'var(--color-primary-600)' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
