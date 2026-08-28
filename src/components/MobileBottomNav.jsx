import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, ShoppingBag, FileText, MessageCircle, User,
  LayoutDashboard, Tractor, Shield, Bell, Plus, ShoppingCart
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function MobileBottomNav() {
  const { user, unreadNotifications } = useAuth()
  const location = useLocation()

  // Determine role-based bottom nav items
  const role = user?.role

  let navItems = []

  if (role === 'farmer') {
    navItems = [
      // The public marketplace. Farmers browse and buy here like anyone else,
      // and previously the only route back to the storefront was the sidebar.
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/farmer/products', label: 'Products', icon: ShoppingBag },
      { to: '/farmer/requests', label: 'Requests', icon: FileText },
      { to: '/farmer/profile', label: 'Farm', icon: Tractor },
    ]
  } else if (role === 'admin') {
    navItems = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/users', label: 'Users', icon: User },
      { to: '/admin/products', label: 'Products', icon: ShoppingBag },
      { to: '/admin/requests', label: 'Requests', icon: FileText },
      { to: '/admin/reports', label: 'Admin', icon: Shield },
    ]
  } else if (role === 'customer') {
    navItems = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/products', label: 'Shop', icon: ShoppingBag },
      // The cart, at thumb height. There was no route to it from the bottom bar
      // at all — a customer shopping on a phone had to open the hamburger or go
      // back through a product page. Only on the customer row: the farmer and
      // admin rows are already at five and six items, and they reach the cart
      // from the drawer.
      { to: '/cart', label: 'Cart', icon: ShoppingCart },
      { to: '/dashboard/requests', label: 'Requests', icon: FileText },
      { to: '/dashboard', label: 'Account', icon: User },
    ]
  } else {
    // Guest nav items
    navItems = [
      { to: '/', label: 'Home', icon: Home, end: true },
      { to: '/products', label: 'Shop', icon: ShoppingBag },
      { to: '/farmers', label: 'Farmers', icon: Tractor },
      { to: '/how-it-works', label: 'Info', icon: FileText },
      { to: '/auth', label: 'Sign In', icon: User },
    ]
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <div className="mobile-bottom-nav__inner">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? 'active' : ''}`}
          >
            <div className="mobile-bottom-nav__icon-wrap">
              <Icon size={20} />
              {label === 'Messages' && unreadNotifications > 0 && (
                <span className="mobile-bottom-nav__badge" />
              )}
            </div>
            <span className="mobile-bottom-nav__label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
