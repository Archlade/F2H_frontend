import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import UserAvatar from '../components/UserAvatar'
import {
  LayoutDashboard, Users, Tractor, ShoppingBag, Tag, FileText,
  Star, Flag, Sparkles, Globe, ClipboardList, Megaphone,
  BarChart2, LogOut, Shield, Menu, X, ChevronRight, ChevronLeft, Boxes, Ticket, Image,
  Repeat, SlidersHorizontal, Table2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MobileBottomNav from '../components/MobileBottomNav'
import toast from 'react-hot-toast'
import { usePrivatePageSeo } from '../utils/seo'

const adminNav = [
  { section: 'Overview' },
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { section: 'Platform' },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/farmers', label: 'Farmers', icon: Tractor },
  { to: '/admin/products', label: 'Products', icon: ShoppingBag },
  { to: '/admin/baskets', label: 'Weekly Baskets', icon: Repeat },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/orders', label: 'All orders', icon: FileText },
  { to: '/admin/requests', label: 'Requests', icon: FileText },

  { section: 'Content' },
  { to: '/admin/featured', label: 'Featured Content', icon: Sparkles },
  { to: '/admin/homepage', label: 'Homepage CMS', icon: Globe },
  { to: '/admin/banners', label: 'Ad Banners', icon: Image },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { section: 'Moderation' },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { section: 'System' },
  // Named 'Reports & data' rather than 'Reports': the Moderation section
  // above already has a 'Reports' entry for flagged content, and two
  // identically-named links in one sidebar is a coin toss every time.
  { to: '/admin/insights', label: 'Reports & data', icon: Table2 },
  { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
]

export default function AdminLayout() {
  usePrivatePageSeo('Admin')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
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
            aria-label="Toggle Admin Drawer"
          >
            {mobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/admin" aria-label="F2H Admin" className="flex items-center gap-2">
            <picture>
              <source srcSet="/f2h-logo-navbar.webp" type="image/webp" />
              <img
                src="/f2h-logo-navbar.png"
                alt="F2H - Farmers to Home"
                className="f2h-logo-img f2h-logo-img--drawer"
              />
            </picture>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Admin</span>
          </NavLink>
        </div>

        <div className="flex items-center gap-2">
          <UserAvatar user={user} size="sm" style={{ background: '#3b82f6', color: 'white' }} />
        </div>
      </header>

      {/* Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="dashboard-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${mobileDrawerOpen ? 'drawer-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        {/* Brand */}
        <div className="dashboard-sidebar__brand" style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <NavLink to="/admin" style={{ display: 'flex', flexDirection: 'column', gap: 4 }} aria-label="F2H Admin Dashboard">
            <div className="flex items-center gap-2">
              <picture>
                <source srcSet="/f2h-logo-darkbg.webp" type="image/webp" />
                <img
                  src="/f2h-logo-darkbg.png"
                  alt="F2H - Farmers to Home"
                  className="f2h-logo-img f2h-logo-img--sidebar dashboard-sidebar__label"
                />
              </picture>
            </div>
            <div className="dashboard-sidebar__label" style={{ fontSize: '0.7rem', color: 'var(--color-gray-500)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Admin Control Center
            </div>
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

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {adminNav.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="dashboard-sidebar__section-label" style={{ marginTop: i > 0 ? '16px' : '8px' }}>
                  {item.section}
                </div>
              )
            }
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="dashboard-sidebar__label" style={{ color: 'var(--color-gray-400)', fontSize: '0.8125rem', padding: '4px 12px', marginBottom: '8px' }}>
            {user?.full_name}
          </div>
          <button className="sidebar-link w-full" onClick={handleLogout}
            style={{ color: 'var(--color-error)' }} title="Sign Out">
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>

      <MobileBottomNav />
    </div>
  )
}
