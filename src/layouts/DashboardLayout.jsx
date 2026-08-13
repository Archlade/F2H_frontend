import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import {
  LayoutDashboard, ShoppingBag, Heart, MessageCircle,
  Bell, Star, MapPin, User, LogOut, Package,
  Tractor, BarChart2, Boxes, FileText, Plus, Menu, X, ChevronRight, ChevronLeft, Repeat,
  ShoppingCart
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MobileBottomNav from '../components/MobileBottomNav'
import toast from 'react-hot-toast'

const customerNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/requests', label: 'Requests', icon: FileText },
  { to: '/dashboard/orders', label: 'Orders', icon: Package },
  { to: '/dashboard/family-pack-orders', label: 'Weekly Basket', icon: Boxes },
  { to: '/dashboard/chat', label: 'Messages', icon: MessageCircle },
  { to: '/dashboard/favorites', label: 'Favorites', icon: Heart },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/reviews', label: 'My Reviews', icon: Star },
  { to: '/dashboard/addresses', label: 'Addresses', icon: MapPin },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
]

const farmerNav = [
  { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/farmer/products', label: 'My Products', icon: ShoppingBag },
  { to: '/farmer/family-packs', label: 'Family Packs', icon: Boxes },
  // Renamed: this is the supply side — baskets containing this farm's produce.
  // A farmer's own basket lives under the buying group below, and two entries
  // both called "Weekly Baskets" would be indistinguishable.
  { to: '/farmer/subscriptions', label: 'Baskets I Supply', icon: Repeat },
  { to: '/farmer/family-pack-orders', label: 'Pack Orders', icon: Package },
  { to: '/farmer/requests', label: 'Requests', icon: FileText },
  { to: '/farmer/orders', label: 'Orders', icon: Package },
  { to: '/farmer/inventory', label: 'Inventory', icon: Boxes },
  // Farmers buy from each other, so their own purchases need somewhere to
  // live that is clearly not the selling screens above — the two carry
  // opposite actions (accept/reject vs cancel).
  { to: '/farmer/purchases', label: 'My Purchases', icon: ShoppingCart },
  { to: '/farmer/my-basket', label: 'My Weekly Basket', icon: Boxes },
  { to: '/farmer/chat', label: 'Messages', icon: MessageCircle },
  { to: '/farmer/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/farmer/notifications', label: 'Notifications', icon: Bell },
  { to: '/farmer/profile', label: 'Farm Profile', icon: Tractor },
]


export default function DashboardLayout({ role }) {
  const { user, logout, unreadNotifications } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const nav = role === 'farmer' ? farmerNav : customerNav

  // Close mobile drawer on location change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile & Tablet Header Bar */}
      <header className="dashboard-mobile-header">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-ghost btn-icon dashboard-mobile-header__toggle"
            onClick={() => setMobileDrawerOpen((o) => !o)}
            aria-label="Toggle Navigation Drawer"
          >
            {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/" aria-label="F2H Home" className="flex items-center">
            <picture>
              <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
              <img
                src="/f2h-logo-navbar.png"
                alt="F2H - Farmers to Home"
                className="f2h-logo-img f2h-logo-img--drawer"
              />
            </picture>
          </NavLink>
        </div>

        <div className="flex items-center gap-2">
          {role === 'farmer' && (
            <NavLink to="/farmer/products/new" className="btn btn-primary btn-sm hidden-mobile">
              <Plus size={14} /> Add Product
            </NavLink>
          )}

          <NavLink to={role === 'farmer' ? '/farmer/notifications' : '/dashboard/notifications'} className="btn btn-ghost btn-icon notif-badge">
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="notif-badge__dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
            )}
          </NavLink>

          <UserAvatar user={user} size="sm" />
        </div>
      </header>

      {/* Drawer Overlay for Mobile & Tablet */}
      {mobileDrawerOpen && (
        <div
          className="dashboard-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileDrawerOpen ? 'drawer-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {/* Logo (Desktop) */}
        <div className="dashboard-sidebar__brand" style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="F2H Home">
            <picture>
              <source srcSet="/f2h-logo-darkbg.webp" type="image/webp" />
              <img
                src="/f2h-logo-darkbg.png"
                alt="F2H - Farmers to Home"
                className="f2h-logo-img f2h-logo-img--sidebar dashboard-sidebar__label"
              />
            </picture>
          </NavLink>
          <button
            type="button"
            className="dashboard-sidebar__collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* User info */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="dashboard-sidebar__label" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }} className="truncate">
                {user?.full_name}
              </div>
              <div style={{ color: 'var(--color-gray-500)', fontSize: '0.75rem' }}>
                {role === 'farmer' ? user?.farmer_profile?.farm_name || 'Farmer' : 'Customer'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="dashboard-sidebar__section" style={{ flex: 1 }}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === 'Notifications' && unreadNotifications > 0 && (
                <span className="badge" style={{ marginLeft: 'auto' }}>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Quick action button */}
        {role === 'farmer' && (
          <div className="dashboard-sidebar__label" style={{ padding: '12px' }}>
            <NavLink to="/farmer/products/new" className="btn btn-primary w-full">
              <Plus size={16} /> Add Product
            </NavLink>
          </div>
        )}

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
          <button className="sidebar-link w-full" onClick={handleLogout}
            style={{ color: 'var(--color-gray-400)' }} title="Sign Out">
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
