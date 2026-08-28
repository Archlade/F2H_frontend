import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import UserAvatar from './UserAvatar'
import { useCart } from '../context/CartContext'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Search, Bell, User, LogOut, LayoutDashboard,
  ChevronDown, Menu, X, Tractor, Home, ShoppingBag, FileText, MapPin,
  ShoppingCart, Repeat
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout, unreadNotifications, loading: authLoading } = useAuth()
  const { cart } = useCart()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out successfully')
    navigate('/')
    setUserMenuOpen(false)
    setMenuOpen(false)
  }

  const dashboardLink = user?.role === 'farmer' ? '/farmer' : user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="container navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="F2H - Farmers to Home" onClick={() => setMenuOpen(false)}>
          <picture>
            <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
            <img
              src="/f2h-logo-navbar.png"
              alt="F2H - Farmers to Home"
              className="f2h-logo-img f2h-logo-img--navbar"
            />
          </picture>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar__nav">
          <NavLink to="/products" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
            Products
          </NavLink>
          <NavLink to="/farmers" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
            Farmers
          </NavLink>
          <NavLink to="/weekly-basket" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
            Weekly Basket
          </NavLink>
          <NavLink to="/how-it-works" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}>
            How It Works
          </NavLink>
          {/* Any signed-in account, not just customers.

              Farmers buy from each other and admins may buy too — the server has
              no role check on the cart or the request endpoints, and
              `ProductCard` already offers them an Add to cart button. Gated on
              `role === 'customer'`, this let a farmer or an admin fill a cart
              from the product grid and then gave them no way to open it. */}
          {user && (
            <NavLink to="/cart" className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}
                     style={{ position: 'relative' }}>
              <ShoppingCart size={16} style={{ marginRight: 4, verticalAlign: -2 }} />
              Cart
              {cart.count > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -10,
                  background: 'var(--color-primary-600)', color: '#fff',
                  borderRadius: 999, fontSize: 10, fontWeight: 700,
                  minWidth: 16, height: 16, lineHeight: '16px', textAlign: 'center',
                  padding: '0 4px',
                }}>{cart.count}</span>
              )}
            </NavLink>
          )}
        </div>


        {/* Desktop / Shared Actions */}
        <div className="navbar__actions">
          {/* Search trigger */}
          <button
            className="btn btn-ghost btn-icon touch-target"
            onClick={() => navigate('/products')}
            aria-label="Search products"
            title="Search products"
          >
            <Search size={20} />
          </button>

          {user ? (
            <>
              {/* Notification bell */}
              <Link to={`${dashboardLink}/notifications`} className="btn btn-ghost btn-icon notif-badge touch-target" aria-label="Notifications">
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="notif-badge__dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
                )}
              </Link>

              {/* User menu (Desktop) */}
              <div ref={userMenuRef} className="navbar__user-menu-desktop" style={{ position: 'relative' }}>
                <button
                  className="flex items-center gap-2 btn btn-secondary btn-sm touch-target"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <UserAvatar user={user} size={28} />
                  <span className="text-sm font-medium hide-on-tablet">{user.first_name}</span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div role="menu" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'white', borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-gray-100)',
                    minWidth: 220, overflow: 'hidden', zIndex: 'var(--z-dropdown)',
                  }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-gray-100)' }}>
                      <div className="font-semibold text-dark">{user.full_name}</div>
                      <div className="text-xs text-muted truncate">{user.email}</div>
                    </div>
                    <div style={{ padding: '8px' }}>
                      <Link to={dashboardLink} className="sidebar-link" role="menuitem"
                        style={{ color: 'var(--color-gray-700)', borderRadius: 'var(--radius-md)' }}
                        onClick={() => setUserMenuOpen(false)}>
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      {user.role === 'farmer' && (
                        <Link to="/farmer/products/new" className="sidebar-link" role="menuitem"
                          style={{ color: 'var(--color-gray-700)', borderRadius: 'var(--radius-md)' }}
                          onClick={() => setUserMenuOpen(false)}>
                          <Tractor size={16} />
                          Add Product
                        </Link>
                      )}
                      <button className="sidebar-link w-full" onClick={handleLogout} role="menuitem"
                        style={{ color: 'var(--color-error)', borderRadius: 'var(--radius-md)' }}>
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : authLoading ? (
            // The session is still being fetched. Showing "Sign In / Get
            // Started" here is a guess, and on every refresh it was the wrong
            // one for anyone signed in — the guest buttons flashed up on every
            // page, then swapped for the avatar. A blank of the same width is
            // honest and does not move the layout.
            <div className="navbar__guest-ctas" aria-hidden="true" style={{ visibility: 'hidden' }}>
              <Link to="/auth?mode=login" className="btn btn-ghost btn-sm" tabIndex={-1}>Sign In</Link>
              <Link to="/auth?mode=register" className="btn btn-primary btn-sm" tabIndex={-1}>Get Started</Link>
            </div>
          ) : (
            <div className="navbar__guest-ctas">
              <Link to="/auth?mode=login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/auth?mode=register" className="btn btn-primary btn-sm">Get Started</Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            className="btn btn-ghost btn-icon navbar__mobile-toggle touch-target"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Navigation — portaled to <body> so it
          escapes the navbar's backdrop-filter, which would otherwise
          create a CSS containing block and trap this fixed-position
          overlay inside the ~64px navbar instead of the full viewport. */}
      {menuOpen && createPortal(
        <div className="navbar__mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div className="navbar__mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="navbar__mobile-drawer-header">
              <Link to="/" onClick={() => setMenuOpen(false)} aria-label="F2H Home">
                <picture>
                  <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
                  <img
                    src="/f2h-logo-navbar.png"
                    alt="F2H - Farmers to Home"
                    className="f2h-logo-img f2h-logo-img--drawer"
                  />
                </picture>
              </Link>
              <button className="btn btn-ghost btn-icon touch-target" onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {user && (
              <div className="navbar__mobile-user-card">
                <UserAvatar user={user} size="md" />
                <div>
                  <div className="font-bold text-dark">{user.full_name}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                  <div className="badge badge-success" style={{ marginTop: 4 }}>
                    {user.role?.toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            <div className="navbar__mobile-links">
              <NavLink to="/" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={18} /> Home
              </NavLink>
              <NavLink to="/products" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                <ShoppingBag size={18} /> Fresh Products
              </NavLink>
              <NavLink to="/farmers" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                <Tractor size={18} /> Local Farmers
              </NavLink>

              <NavLink to="/weekly-basket" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                <Repeat size={18} /> Weekly Basket
              </NavLink>

              <NavLink to="/how-it-works" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                <FileText size={18} /> How It Works
              </NavLink>

              {user ? (
                <>
                  <div className="divider" />

                  {/* The drawer had no cart entry at all, so on a phone browser
                      the cart was unreachable from the navigation for everyone
                      — the desktop bar has had one all along. The count is
                      carried here too; a cart you cannot see the size of is a
                      cart you forget you filled. */}
                  <NavLink to="/cart" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                    <ShoppingCart size={18} /> Cart
                    {cart.count > 0 && (
                      <span style={{
                        marginLeft: 8,
                        background: 'var(--color-primary-600)', color: '#fff',
                        borderRadius: 999, fontSize: 11, fontWeight: 700,
                        minWidth: 18, height: 18, lineHeight: '18px',
                        textAlign: 'center', padding: '0 5px', display: 'inline-block',
                      }}>{cart.count}</span>
                    )}
                  </NavLink>

                  <NavLink to={dashboardLink} className="navbar__mobile-link highlight" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={18} /> My Dashboard
                  </NavLink>
                  {user.role === 'farmer' && (
                    <NavLink to="/farmer/products/new" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                      <Tractor size={18} /> Add New Product
                    </NavLink>
                  )}
                  <button className="navbar__mobile-link danger" onClick={handleLogout}>
                    <LogOut size={18} /> Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="divider" />
                  <Link to="/auth?mode=login" className="btn btn-secondary btn-lg w-full" onClick={() => setMenuOpen(false)}>
                    Sign In
                  </Link>
                  <Link to="/auth?mode=register" className="btn btn-primary btn-lg w-full" onClick={() => setMenuOpen(false)}>
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  )
}
